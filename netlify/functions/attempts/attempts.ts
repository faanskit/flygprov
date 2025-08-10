import type { Handler, HandlerEvent } from "@netlify/functions";
import { ObjectId } from "mongodb";
import connectToDatabase from "../src/database";
import { TestAttempt } from "../src/models/TestAttempt";
import { Question } from "../src/models/Question";
import { Test } from "../src/models/Test";
import { verifyToken } from "../src/utils/auth";

const handler: Handler = async (event: HandlerEvent, context) => {
    if (event.httpMethod !== "GET") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    const decodedToken = verifyToken(event);
    if (!decodedToken) {
        return { statusCode: 401, body: "Unauthorized" };
    }

    const pathParts = event.path.split('/');
    const attemptId = pathParts.pop();

    if (!attemptId) {
        return { statusCode: 400, body: "Attempt ID missing" };
    }

    try {
        const { db } = await connectToDatabase();
        const studentId = new ObjectId(decodedToken.userId);

        const attempt = await db.collection<TestAttempt>('test_attempts').findOne({ 
            _id: new ObjectId(attemptId) 
        });

        if (!attempt) {
            return { statusCode: 404, body: "Test attempt not found." };
        }

        // Endast den som gjort provet eller en examinator får se resultatet
        if (decodedToken.role === 'student' && !attempt.studentId.equals(studentId)) {
            return { statusCode: 403, body: "Forbidden: You cannot view this result." };
        }

        const test = await db.collection<Test>('tests').findOne({ _id: attempt.testId });
        if (!test) {
            return { statusCode: 404, body: "Associated test not found." };
        }

        const questions = await db.collection<Question>('questions').find({ 
            _id: { $in: test.questionIds } 
        }).toArray();

        // Returnera en kombination av provförsöket och de fullständiga frågorna
        return {
            statusCode: 200,
            body: JSON.stringify({
                attempt,
                questions
            }),
            headers: { "Content-Type": "application/json" }
        };

    } catch (error) {
        console.error("Error fetching result:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" })
        };
    }
};

export { handler };
