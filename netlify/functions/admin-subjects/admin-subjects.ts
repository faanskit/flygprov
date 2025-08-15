import type { Handler, HandlerEvent } from "@netlify/functions";
import { Db, ObjectId } from "mongodb";
import connectToDatabase from "../src/database";
import { Subject } from "../src/models/Subject";
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
        const subjectId = pathParts.length > 2 ? pathParts[2] : null;

        if (event.httpMethod === "GET") {
            const subjects = await db.collection<Subject>('subjects').find().sort({ name: 1 }).toArray();
            return { statusCode: 200, body: JSON.stringify(subjects) };
        }
        
        if (event.httpMethod === "POST") {
            const body = JSON.parse(event.body || '{}');
            const { name, code, description, defaultTimeLimitMinutes } = body;

            if (!name || !code || !defaultTimeLimitMinutes) {
                return { statusCode: 400, body: JSON.stringify({ error: "Name, code, and defaultTimeLimitMinutes are required" }) };
            }

            const existingSubject = await db.collection<Subject>('subjects').findOne({ code });
            if (existingSubject) {
                return { statusCode: 409, body: JSON.stringify({ error: "Subject with this code already exists" }) };
            }

            const newSubject: Subject = {
                name,
                code,
                description: description || "",
                defaultTimeLimitMinutes: Number(defaultTimeLimitMinutes)
            };

            const result = await db.collection<Subject>('subjects').insertOne(newSubject);
            return { statusCode: 201, body: JSON.stringify({ insertedId: result.insertedId }) };
        }

        if (event.httpMethod === "DELETE" && subjectId) {
            const objectId = new ObjectId(subjectId);

            // First, delete all questions associated with the subject
            const deleteQuestionsResult = await db.collection('questions').deleteMany({ subjectId: objectId });
            
            // Then, delete the subject itself
            const deleteSubjectResult = await db.collection<Subject>('subjects').deleteOne({ _id: objectId });

            if (deleteSubjectResult.deletedCount === 0) {
                return { statusCode: 404, body: JSON.stringify({ error: "Subject not found" }) };
            }

            return { 
                statusCode: 200, 
                body: JSON.stringify({ 
                    message: "Subject and associated questions deleted successfully",
                    deletedQuestionsCount: deleteQuestionsResult.deletedCount
                }) 
            };
        }
        
        return { statusCode: 404, body: JSON.stringify({ error: "Endpoint not found" }) };
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
        console.error("Error in admin-subjects handler:", error);
        return { statusCode: 500, body: JSON.stringify({ error: errorMessage }) };
    }
};

export { handler };
