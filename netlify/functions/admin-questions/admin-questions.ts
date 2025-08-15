import type { Handler, HandlerEvent } from "@netlify/functions";
import { Db, ObjectId } from "mongodb";
import connectToDatabase from "../src/database";
import { Question } from "../src/models/Question";
import { verifyToken } from "../src/utils/auth";

// --- Main Handler ---

const handler: Handler = async (event: HandlerEvent) => {
    const decodedToken = verifyToken(event);
    if (!decodedToken || decodedToken.role !== 'admin') {
        return { statusCode: 403, body: JSON.stringify({ error: "Forbidden: Admin access required" }) };
    }

    try {
        const { db } = await connectToDatabase();
        const pathParts = event.path.split('/').filter(p => p);
        const questionId = pathParts.length > 2 ? pathParts[2] : null;

        // GET /api/admin-questions?subjectId=...
        if (event.httpMethod === "GET") {
            const subjectId = event.queryStringParameters?.subjectId;
            if (!subjectId) {
                return { statusCode: 400, body: JSON.stringify({ error: "subjectId query parameter is required" }) };
            }
            const questions = await db.collection<Question>('questions')
                .find({ subjectId: new ObjectId(subjectId) })
                .sort({ _id: -1 }) // Sort by creation date descending
                .toArray();
            return { statusCode: 200, body: JSON.stringify(questions) };
        }
        
        // POST /api/admin-questions
        if (event.httpMethod === "POST") {
            const body = JSON.parse(event.body || '{}');
            const { subjectId, questionText, options, correctOptionIndex } = body;

            if (!subjectId || !questionText || !options || options.length !== 4 || correctOptionIndex === undefined) {
                return { statusCode: 400, body: JSON.stringify({ error: "Missing required fields for question creation." }) };
            }

            const newQuestion: Question = {
                subjectId: new ObjectId(subjectId),
                questionText,
                options,
                correctOptionIndex,
                active: true // Questions are active by default
            };

            const result = await db.collection<Question>('questions').insertOne(newQuestion);
            return { statusCode: 201, body: JSON.stringify({ insertedId: result.insertedId }) };
        }

        // PUT /api/admin-questions/:questionId
        if (event.httpMethod === "PUT" && questionId) {
            const body = JSON.parse(event.body || '{}');
            const { questionText, options, correctOptionIndex, active } = body;

            const updateDoc: Partial<Question> = {};
            if (questionText) updateDoc.questionText = questionText;
            if (options) updateDoc.options = options;
            if (correctOptionIndex !== undefined) updateDoc.correctOptionIndex = correctOptionIndex;
            if (active !== undefined) updateDoc.active = active;

            const result = await db.collection<Question>('questions').updateOne(
                { _id: new ObjectId(questionId) },
                { $set: updateDoc }
            );

            if (result.matchedCount === 0) {
                return { statusCode: 404, body: JSON.stringify({ error: "Question not found" }) };
            }
            return { statusCode: 200, body: JSON.stringify({ message: "Question updated successfully" }) };
        }

        // DELETE /api/admin-questions/:questionId
        if (event.httpMethod === "DELETE" && questionId) {
            const result = await db.collection<Question>('questions').deleteOne({ _id: new ObjectId(questionId) });

            if (result.deletedCount === 0) {
                return { statusCode: 404, body: JSON.stringify({ error: "Question not found" }) };
            }
            return { statusCode: 200, body: JSON.stringify({ message: "Question deleted successfully" }) };
        }
        
        return { statusCode: 404, body: JSON.stringify({ error: "Endpoint not found" }) };
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
        console.error("Error in admin-questions handler:", error);
        return { statusCode: 500, body: JSON.stringify({ error: errorMessage }) };
    }
};

export { handler };
