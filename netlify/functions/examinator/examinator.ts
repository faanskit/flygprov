import type { Handler, HandlerEvent } from "@netlify/functions";
import { Db, ObjectId } from "mongodb";
import connectToDatabase from "../src/database";
import { User } from "../src/models/User";
import { Subject } from "../src/models/Subject";
import { TestAttempt } from "../src/models/TestAttempt";
import { Question } from "../src/models/Question";
import { verifyToken } from "../src/utils/auth";
import bcrypt from "bcryptjs";

// --- Helper Functions ---

async function getStudentOverview(db: Db) {
    const students = await db.collection<User>('users').find({ role: 'student', archived: false }, { projection: { password: 0 } }).toArray();
    const subjects = await db.collection<Subject>('subjects').find().toArray();
    const allAttempts = await db.collection<TestAttempt>('test_attempts').find({}).toArray();
    return students.map(student => {
        const studentAttempts = allAttempts.filter(a => a.studentId.equals(student._id!));
        let passedSubjectsCount = 0;
        subjects.forEach(subject => {
            if (studentAttempts.some(a => a.subjectId.equals(subject._id!) && a.passed)) {
                passedSubjectsCount++;
            }
        });
        return { studentId: student._id, username: student.username, passedSubjects: passedSubjectsCount, totalSubjects: subjects.length };
    });
}

async function getStudentDetails(db: Db, studentId: ObjectId) {
    const student = await db.collection<User>('users').findOne({ _id: studentId }, { projection: { password: 0 }});
    if (!student) throw new Error("Student not found");

    const subjects = await db.collection<Subject>('subjects').find().toArray();
    const attempts = await db.collection<TestAttempt>('test_attempts').find({ studentId }).toArray();
    const assignedTests = await db.collection('tests').find({ assignedStudentIds: studentId }).toArray();

    const details = subjects.map(subject => {
        const subjectAttempts = attempts.filter(a => a.subjectId.equals(subject._id!));
        const hasPassed = subjectAttempts.some(a => a.passed);
        const bestScore = subjectAttempts.length > 0 ? Math.max(...subjectAttempts.map(a => a.score)) : null;
        
        // Finns det ett tilldelat prov för detta ämne som inte har några försök än?
        const isAssignedAndNotStarted = assignedTests.some(t => t.subjectId.equals(subject._id!) && !attempts.some(a => a.testId.equals(t._id!)));

        let status = 'not_started';
        if (hasPassed) {
            status = 'passed';
        } else if (isAssignedAndNotStarted) {
            status = 'assigned'; // Ny status!
        } else if (subjectAttempts.length > 0) {
            status = 'in_progress';
        }

        return { 
            subjectId: subject._id, 
            subjectName: subject.name, 
            status, 
            attemptsCount: subjectAttempts.length, 
            bestScore: bestScore !== null ? `${bestScore}/20` : null 
        };
    });
    return { student, details, attempts };
}

async function createTestSession(db: Db, subjectId: ObjectId) {
    const subject = await db.collection<Subject>('subjects').findOne({ _id: subjectId });
    if (!subject) throw new Error("Subject not found");

    const questions = await db.collection<Question>('questions').aggregate([
        { $match: { subjectId: subjectId, active: true } },
        { $sample: { size: 20 } }
    ]).toArray();
    if (questions.length < 20) throw new Error(`Not enough active questions in the database for subject ${subjectId}. Found only ${questions.length}.`);
    
    return { questions, subject };
}

async function replaceQuestion(db: Db, subjectId: ObjectId, excludeIds: string[]) {
    const questions = await db.collection<Question>('questions').aggregate([
        { $match: { 
            subjectId: subjectId,
            active: true,
            _id: { $nin: excludeIds.map(id => new ObjectId(id)) } // Exkludera befintliga frågor
        }},
        { $sample: { size: 1 } }
    ]).toArray();

    if (questions.length === 0) {
        throw new Error("No more unique questions available in the database for this subject.");
    }
    return questions[0];
}

// --- New Student Management Helper Functions ---

async function getAllStudents(db: Db, status?: string) {
    let filter: any = { role: 'student' };
    
    if (status === 'active') {
        filter.archived = false;
    } else if (status === 'archived') {
        filter.archived = true;
    }
    // If status is 'all' or undefined, no additional filtering needed
    
    const students = await db.collection<User>('users')
        .find(filter, { projection: { password: 0 } })
        .sort({ createdAt: -1 })
        .toArray();
    
    return students.map(student => ({
        userId: student._id,
        username: student.username,
        status: student.archived ? 'archived' : 'active',
        authMethod: student.authMethod,
        createdAt: student.createdAt,
        forcePasswordChange: student.forcePasswordChange
    }));
}

async function createNewStudent(db: Db, username: string) {
    // Check if username already exists
    const existingUser = await db.collection<User>('users').findOne({ username });
    if (existingUser) {
        throw new Error("Username already exists");
    }
    
    // Generate simple temporary password
    const tempPassword = `${username}123`;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    
    const newStudent: User = {
        username,
        password: hashedPassword,
        authMethod: 'local',
        role: 'student',
        createdAt: new Date(),
        archived: false,
        forcePasswordChange: true
    };
    
    const result = await db.collection<User>('users').insertOne(newStudent);
    
    return {
        userId: result.insertedId,
        username: newStudent.username,
        tempPassword
    };
}

async function archiveStudent(db: Db, studentId: ObjectId) {
    const result = await db.collection<User>('users').updateOne(
        { _id: studentId, role: 'student' },
        { $set: { archived: true } }
    );
    
    if (result.matchedCount === 0) {
        throw new Error("Student not found");
    }
    
    return { message: "Student archived successfully" };
}

async function reactivateStudent(db: Db, studentId: ObjectId) {
    const result = await db.collection<User>('users').updateOne(
        { _id: studentId, role: 'student' },
        { $set: { archived: false } }
    );
    
    if (result.matchedCount === 0) {
        throw new Error("Student not found");
    }
    
    return { message: "Student reactivated successfully" };
}

async function deleteStudent(db: Db, studentId: ObjectId) {
    // Optional: Check for related data and handle it (e.g., test attempts)
    // For now, we'll just delete the user.
    const result = await db.collection<User>('users').deleteOne(
        { _id: studentId, role: 'student' }
    );

    if (result.deletedCount === 0) {
        throw new Error("Student not found or already deleted");
    }

    return { message: "Student deleted permanently" };
}

async function resetStudentPassword(db: Db, studentId: ObjectId) {
    const student = await db.collection<User>('users').findOne({ _id: studentId, role: 'student' });
    if (!student) {
        throw new Error("Student not found");
    }

    const tempPassword = `${student.username}123`;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const result = await db.collection<User>('users').updateOne(
        { _id: studentId },
        { $set: { password: hashedPassword, forcePasswordChange: true } }
    );

    if (result.matchedCount === 0) {
        throw new Error("Student not found");
    }

    return { tempPassword };
}

// --- Main Handler ---

const handler: Handler = async (event: HandlerEvent, context) => {
    const decodedToken = verifyToken(event);
    if (!decodedToken) {
        return { statusCode: 401, body: "Unauthorized" };
    }
    
    if (decodedToken.role !== 'examinator' && decodedToken.role !== 'administrator' && decodedToken.role !== 'admin') {
        return { statusCode: 403, body: "Forbidden" };
    }

    try {
        const { db } = await connectToDatabase();
        
        // Parse the path to determine the endpoint
        const pathParts = event.path.split('/').filter(p => p);
        const isStudentManagement = pathParts.length >= 3 && pathParts[2] === 'students';
        const isChangePassword = pathParts.length >= 3 && pathParts[2] === 'change-password';

        if (isChangePassword && event.httpMethod === 'PUT') {
            const body = JSON.parse(event.body || '{}');
            const { currentPassword, newPassword } = body;

            if (!currentPassword || !newPassword) {
                return { statusCode: 400, body: JSON.stringify({ error: "Current and new password are required." }) };
            }

            const userId = new ObjectId(decodedToken.userId);
            const user = await db.collection<User>('users').findOne({ _id: userId });

            if (!user || !user.password) {
                return { statusCode: 404, body: JSON.stringify({ error: "User not found or password not set." }) };
            }

            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return { statusCode: 400, body: JSON.stringify({ error: "Incorrect current password." }) };
            }

            const hashedNewPassword = await bcrypt.hash(newPassword, 10);
            await db.collection<User>('users').updateOne(
                { _id: userId },
                { $set: { password: hashedNewPassword, forcePasswordChange: false } }
            );

            return { statusCode: 200, body: JSON.stringify({ message: "Password changed successfully." }) };
        }
        
        if (isStudentManagement) {
            // Handle student management endpoints
            return await handleStudentManagement(db, event, pathParts);
        }
        
        // Handle existing examiner endpoints
        if (event.httpMethod === "GET") {
            const studentId = pathParts.length > 2 ? pathParts[pathParts.length - 1] : null;
            
            if (studentId) {
                const data = await getStudentDetails(db, new ObjectId(studentId));
                return { statusCode: 200, body: JSON.stringify(data) };
            } else {
                const overview = await getStudentOverview(db);
                const user = await db.collection<User>('users').findOne({ _id: new ObjectId(decodedToken.userId) });
                return { 
                    statusCode: 200, 
                    body: JSON.stringify({
                        students: overview,
                        forcePasswordChange: user?.forcePasswordChange || false
                    }) 
                };
            }
        }

        if (event.httpMethod === "POST") {
            const body = JSON.parse(event.body || '{}');
            const { action, studentId, subjectId, excludeIds } = body;

            if (action === 'create-test-session') {
                if (!subjectId) return { statusCode: 400, body: "subjectId is required." };
                const data = await createTestSession(db, new ObjectId(subjectId));
                return { statusCode: 200, body: JSON.stringify(data) };
            }
            
            if (action === 'replace-question') {
                if (!subjectId || !excludeIds) return { statusCode: 400, body: "subjectId and excludeIds are required." };
                const data = await replaceQuestion(db, new ObjectId(subjectId), excludeIds);
                return { statusCode: 200, body: JSON.stringify(data) };
            }

            return { statusCode: 400, body: "Invalid action." };
        }

        return { statusCode: 405, body: "Method Not Allowed" };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
        console.error("Error in examinator handler:", error);
        return { statusCode: 500, body: JSON.stringify({ error: errorMessage }) };
    }
};

// --- Student Management Handler ---

async function handleStudentManagement(db: Db, event: HandlerEvent, pathParts: string[]) {
    const studentId = pathParts.length > 3 ? pathParts[3] : null;
    const action = pathParts.length > 4 ? pathParts[4] : null;
    
    try {
        if (event.httpMethod === "GET" && pathParts.length === 3) {
            // GET /api/examinator/students
            const status = event.queryStringParameters?.status;
            const students = await getAllStudents(db, status);
            return { 
                statusCode: 200, 
                body: JSON.stringify(students),
                headers: { "Content-Type": "application/json" }
            };
        }
        
        if (event.httpMethod === "POST" && pathParts.length === 3) {
            // POST /api/examinator/students
            const body = JSON.parse(event.body || '{}');
            const { username } = body;
            
            if (!username) {
                return { statusCode: 400, body: JSON.stringify({ error: "Username is required" }) };
            }
            
            const result = await createNewStudent(db, username);
            return { 
                statusCode: 201, 
                body: JSON.stringify(result),
                headers: { "Content-Type": "application/json" }
            };
        }
        
        if (event.httpMethod === "PUT" && studentId && action) {
            if (action === 'archive') {
                // PUT /api/examinator/students/:studentId/archive
                const result = await archiveStudent(db, new ObjectId(studentId));
                return { 
                    statusCode: 200, 
                    body: JSON.stringify(result),
                    headers: { "Content-Type": "application/json" }
                };
            }
            
            if (action === 'reactivate') {
                // PUT /api/examinator/students/:studentId/reactivate
                const result = await reactivateStudent(db, new ObjectId(studentId));
                return { 
                    statusCode: 200, 
                    body: JSON.stringify(result),
                    headers: { "Content-Type": "application/json" }
                };
            }

            if (action === 'reset-password') {
                // PUT /api/examinator/students/:studentId/reset-password
                const result = await resetStudentPassword(db, new ObjectId(studentId));
                return {
                    statusCode: 200,
                    body: JSON.stringify(result),
                    headers: { "Content-Type": "application/json" }
                };
            }
        }

        if (event.httpMethod === "DELETE" && studentId) {
            // DELETE /api/examinator/students/:studentId
            const result = await deleteStudent(db, new ObjectId(studentId));
            return {
                statusCode: 200,
                body: JSON.stringify(result),
                headers: { "Content-Type": "application/json" }
            };
        }
        
        return { statusCode: 404, body: JSON.stringify({ error: "Endpoint not found" }) };
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
        console.error("Error in student management:", error);
        
        if (errorMessage.includes("Username already exists")) {
            return { 
                statusCode: 409, 
                body: JSON.stringify({ error: errorMessage }),
                headers: { "Content-Type": "application/json" }
            };
        }
        
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: errorMessage }),
            headers: { "Content-Type": "application/json" }
        };
    }
}

export { handler };
