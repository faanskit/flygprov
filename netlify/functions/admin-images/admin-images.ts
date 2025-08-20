import type { Handler, HandlerEvent } from "@netlify/functions";
import connectToDatabase from "../src/database";
import { verifyToken } from "../src/utils/auth";
import { uploadImage, deleteImage } from "../src/utils/google-drive";
import { Question } from "../src/models/Question";

const handler: Handler = async (event: HandlerEvent) => {
    const decodedToken = verifyToken(event);
    console.log("Decoded Token:", decodedToken);
    if (!decodedToken || decodedToken.role !== 'admin') {
        return { statusCode: 403, body: JSON.stringify({ error: "Forbidden: Admin access required" }) };
    }

    try {
        const { db } = await connectToDatabase();

        // POST /api/admin-images - Upload a new image
        if (event.httpMethod === "POST") {
            const body = JSON.parse(event.body || '{}');
            const { fileName, fileContent, mimeType } = body;

            if (!fileName || !fileContent || !mimeType) {
                return { statusCode: 400, body: JSON.stringify({ error: "Missing required fields for image upload." }) };
            }

            // Convert base64 to buffer
            const buffer = Buffer.from(fileContent, 'base64');

            const result = await uploadImage(fileName, mimeType, buffer);
            return { statusCode: 201, body: JSON.stringify(result) };
        }

        // DELETE /api/admin-images/:imageId
        if (event.httpMethod === "DELETE") {
            const pathParts = event.path.split('/').filter(p => p);
            const imageId = pathParts.pop();

            if (!imageId) {
                return { statusCode: 400, body: JSON.stringify({ error: "Image ID is required." }) };
            }

            // Check if the image is used by any question
            const questionUsingImage = await db.collection<Question>('questions').findOne({ imageId: imageId });

            if (questionUsingImage) {
                return { 
                    statusCode: 409, // Conflict
                    body: JSON.stringify({ error: "Cannot delete image: It is currently used by at least one question." }) 
                };
            }

            await deleteImage(imageId);
            return { statusCode: 200, body: JSON.stringify({ message: "Image deleted successfully." }) };
        }

        return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
        console.error("Error in admin-images handler:", error);
        return { statusCode: 500, body: JSON.stringify({ error: errorMessage }) };
    }
};

export { handler };
