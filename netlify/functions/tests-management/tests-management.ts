import type { Handler, HandlerEvent } from "@netlify/functions";
import { Db, ObjectId } from "mongodb";
import connectToDatabase from "../src/database";
import { verifyToken } from "../src/utils/auth";
import { Test } from "../src/models/Test";

const handler: Handler = async (event: HandlerEvent, context) => {
    const decodedToken = verifyToken(event);
    if (!decodedToken || decodedToken.role !== 'examinator') {
        return { statusCode: 403, body: "Forbidden: Access is restricted to examinators." };
    }

    try {
        const { db } = await connectToDatabase();
        const testsCollection = db.collection<Test>('tests');
        const examinerId = new ObjectId(decodedToken.userId);
        
        const pathParts = event.path.split('/').filter(p => p);
        const action = pathParts.pop(); // e.g., 'assign' or the testId
        const testId = action !== 'assign' ? action : pathParts.pop();


        // PUT: /api/tests-management/{testId}/assign
        if (event.httpMethod === "PUT" && action === 'assign' && testId) {
            const body = JSON.parse(event.body || '{}');
            const { studentIds } = body;

            if (!Array.isArray(studentIds)) {
                return { statusCode: 400, body: "studentIds must be an array." };
            }

            const result = await testsCollection.updateOne(
                { _id: new ObjectId(testId) },
                { $set: { assignedStudentIds: studentIds.map(id => new ObjectId(id)) } }
            );

            if (result.matchedCount === 0) {
                return { statusCode: 404, body: "Test not found." };
            }

            return {
                statusCode: 200,
                body: JSON.stringify({ message: "Test assigned successfully." }),
                headers: { "Content-Type": "application/json" }
            };
        }

        // GET: /api/tests-management
        if (event.httpMethod === "GET" && !testId) {
            const tests = await testsCollection.find({}).toArray();
            return {
                statusCode: 200,
                body: JSON.stringify(tests),
                headers: { "Content-Type": "application/json" }
            };
        }

        // POST: /api/tests-management
        if (event.httpMethod === "POST") {
            const body = JSON.parse(event.body || '{}');
            const { name, description, subjectId, questionIds, timeLimitMinutes, assignedStudentIds } = body;

            if (!name || !subjectId || !questionIds || !timeLimitMinutes) {
                return { statusCode: 400, body: "Missing required fields: name, subjectId, questionIds, timeLimitMinutes." };
            }

            const newTest: Test = {
                name,
                description: description || "",
                subjectId: new ObjectId(subjectId),
                questionIds: questionIds.map((id: string) => new ObjectId(id)),
                timeLimitMinutes,
                createdAt: new Date(),
                createdBy: examinerId,
                assignedStudentIds: assignedStudentIds ? assignedStudentIds.map((id: string) => new ObjectId(id)) : [],
            };

            const result = await testsCollection.insertOne(newTest);

            return {
                statusCode: 201,
                body: JSON.stringify({ message: "Test created successfully", testId: result.insertedId }),
                headers: { "Content-Type": "application/json" }
            };
        }

        return { statusCode: 405, body: "Method Not Allowed" };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
        console.error("Error in tests-management handler:", error);
        return { statusCode: 500, body: JSON.stringify({ error: errorMessage }) };
    }
};

export { handler };
