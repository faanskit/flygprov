import type { Handler, HandlerEvent } from "@netlify/functions";
import { Db, ObjectId } from "mongodb";
import connectToDatabase from "../src/database";
import { Subject } from "../src/models/Subject";
import { Test } from "../src/models/Test";
import { TestAttempt } from "../src/models/TestAttempt";
import { verifyToken } from "../src/utils/auth";

const getDashboardData = async (db: Db, studentId: ObjectId) => {
    const subjects = await db.collection<Subject>('subjects').find().toArray();
    const attempts = await db.collection<TestAttempt>('test_attempts').find({ studentId }).toArray();

    const dashboardData = subjects.map((subject: Subject) => {
        const subjectAttempts = attempts.filter((a: TestAttempt) => a.subjectId.equals(subject._id!));
        const attemptsCount = subjectAttempts.length;
        const hasPassed = subjectAttempts.some((a: TestAttempt) => a.passed);
        const bestScore = attemptsCount > 0 
            ? Math.max(...subjectAttempts.map((a: TestAttempt) => a.score))
            : null;

        let status = 'locked';
        if (hasPassed) {
            status = 'passed';
        } else if (attemptsCount > 0) {
            status = 'available';
        } else {
            if (subject.code === 'LAW') {
                status = 'available';
            }
        }
        
        if (hasPassed) {
            status = 'passed';
        }

        return {
            subjectId: subject._id,
            subject: subject.name,
            status: status,
            attempts: attemptsCount,
            bestScore: bestScore !== null ? `${bestScore}/20` : null,
        };
    });
    return dashboardData;
};

const getAvailableTests = async (db: Db) => {
    // For now, return all tests. Later, this can be filtered based on student progress.
    const tests = await db.collection<Test>('tests').find({}, {
        projection: { name: 1, description: 1, subjectId: 1 }
    }).toArray();
    return tests;
};

const handler: Handler = async (event: HandlerEvent, context) => {
    if (event.httpMethod !== "GET") {
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
        if (event.path.endsWith('/dashboard')) {
            const data = await getDashboardData(db, studentId);
            return { statusCode: 200, body: JSON.stringify(data), headers: { "Content-Type": "application/json" }};
        }

        if (event.path.endsWith('/tests')) {
            const data = await getAvailableTests(db);
            return { statusCode: 200, body: JSON.stringify(data), headers: { "Content-Type": "application/json" }};
        }

        return { statusCode: 404, body: "Not Found" };

    } catch (error) {
        console.error("Error in student handler:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
    }
};

export { handler };
