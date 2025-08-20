import type { Handler, HandlerEvent } from "@netlify/functions";
import { Db, ObjectId } from "mongodb";
import connectToDatabase from "../src/database";
import { Subject } from "../src/models/Subject";
import { Test } from "../src/models/Test";
import { TestAttempt } from "../src/models/TestAttempt";
import { verifyToken } from "../src/utils/auth";
import bcrypt from "bcryptjs";
import { User } from "../src/models/User";

const getDashboardData = async (db: Db, studentId: ObjectId) => {
    const subjects = await db.collection<Subject>('subjects').find().toArray();
    const attempts = await db.collection<TestAttempt>('test_attempts').find({ studentId }).toArray();
    const assignedTests = await db.collection<Test>('tests').find({ assignedStudentIds: studentId }).toArray();
    
    // Get user info to check forcePasswordChange status
    const user = await db.collection<User>('users').findOne({ _id: studentId }, { projection: { forcePasswordChange: 1 } });

    const dashboardData = subjects.map((subject: Subject) => {
        const subjectAttempts = attempts.filter((a: TestAttempt) => a.subjectId.equals(subject._id!));
        const attemptsCount = subjectAttempts.length;
        const hasPassed = subjectAttempts.some((a: TestAttempt) => a.passed);
        const bestScore = attemptsCount > 0 
            ? Math.max(...subjectAttempts.map((a: TestAttempt) => a.score))
            : null;

        // Finns det ett tilldelat prov för detta ämne som studenten INTE har förbrukat än?
        const hasAvailableTest = assignedTests
            .filter(assignedTest => assignedTest.subjectId.equals(subject._id!))
            .some(assignedTest => {
            // Finns det INGET attempt för detta test där submittedAt !== null?
            return !attempts.some(attempt =>
                attempt.testId.equals(assignedTest._id!) &&
                attempt.submittedAt !== null
            );
            });

        let status = 'locked';
        if (hasPassed) {
            status = 'passed';
        } else if (hasAvailableTest) {
            status = 'available';
        } else if (attemptsCount > 0) {
            // Om det inte finns tillgängliga prov men det finns försök, är det "in progress"
            status = 'in_progress';
        }

        return {
            subjectId: subject._id,
            subject: subject.name,
            status: status,
            attempts: attemptsCount,
            bestScore: bestScore !== null ? `${bestScore}/20` : null,
        };
    });
    
    return {
        subjects: dashboardData,
        forcePasswordChange: user?.forcePasswordChange || false
    };
};

const getAvailableTests = async (db: Db, studentId: ObjectId) => {
    // Return tests specifically assigned to the student.
    const tests = await db.collection<Test>('tests').find({ assignedStudentIds: studentId }).toArray();
    const attempts = await db.collection<TestAttempt>('test_attempts').find({ studentId: new ObjectId(studentId) }).toArray();

    // Skapa en lookup-tabell för försök per test
    const attemptMap: { [key: string]: string } = {};
    for (const attempt of attempts) {
        const testIdStr = attempt.testId.toString();
        if (attempt.passed === true) {
            attemptMap[testIdStr] = 'passed';
        } else if (attempt.passed === false && attempt.submittedAt) {
            if (!attemptMap[testIdStr]) attemptMap[testIdStr] = 'failed';
        } else if (attempt.passed === false && !attempt.submittedAt) {
            if (!attemptMap[testIdStr]) attemptMap[testIdStr] = 'available';
        }
    }

    // Lägg till status på varje test
    return tests.map(test => {
        const status = attemptMap[test._id.toString()] || 'available';
        return { ...test, status };
    });
};

const changePassword = async (db: Db, studentId: ObjectId, currentPassword: string, newPassword: string) => {
    const usersCollection = db.collection<User>('users');
    
    // Get the current user
    const user = await usersCollection.findOne({ _id: studentId });
    if (!user) {
        throw new Error("User not found");
    }
    
    // Verify current password
    if (!user.password) {
        throw new Error("No password set for user");
    }
    
    const isCurrentPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordCorrect) {
        throw new Error("Current password is incorrect");
    }
    
    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password and set forcePasswordChange to false
    const result = await usersCollection.updateOne(
        { _id: studentId },
        { 
            $set: { 
                password: hashedNewPassword,
                forcePasswordChange: false
            } 
        }
    );
    
    if (result.matchedCount === 0) {
        throw new Error("User not found during update");
    }
    
    return { message: "Password changed successfully" };
};

const handler: Handler = async (event: HandlerEvent, context) => {
    if (event.httpMethod !== "GET" && event.httpMethod !== "PUT") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    const decodedToken = verifyToken(event);
    if (!decodedToken || decodedToken.role !== 'student') {
        return { statusCode: 401, body: "Unauthorized" };
    }

    try {
        const { db } = await connectToDatabase();
        const studentId = new ObjectId(decodedToken.userId);

        // Simple router based on path
        if (event.httpMethod === "GET") {
            if (event.path.endsWith('/dashboard')) {
                const data = await getDashboardData(db, studentId);
                return { statusCode: 200, body: JSON.stringify(data), headers: { "Content-Type": "application/json" }};
            }

            if (event.path.endsWith('/tests')) {
                const data = await getAvailableTests(db, studentId);
                return { statusCode: 200, body: JSON.stringify(data), headers: { "Content-Type": "application/json" }};
            }
        }

        if (event.httpMethod === "PUT" && event.path.endsWith('/change-password')) {
            const body = JSON.parse(event.body || '{}');
            const { currentPassword, newPassword } = body;
            
            if (!currentPassword || !newPassword) {
                return { 
                    statusCode: 400, 
                    body: JSON.stringify({ error: "Current password and new password are required" }),
                    headers: { "Content-Type": "application/json" }
                };
            }
            
            if (newPassword.length < 6) {
                return { 
                    statusCode: 400, 
                    body: JSON.stringify({ error: "New password must be at least 6 characters long" }),
                    headers: { "Content-Type": "application/json" }
                };
            }
            
            const result = await changePassword(db, studentId, currentPassword, newPassword);
            return { 
                statusCode: 200, 
                body: JSON.stringify(result),
                headers: { "Content-Type": "application/json" }
            };
        }

        return { statusCode: 404, body: "Not Found" };

    } catch (error) {
        console.error("Error in student handler:", error);
        const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: errorMessage }),
            headers: { "Content-Type": "application/json" }
        };
    }
};

export { handler };
