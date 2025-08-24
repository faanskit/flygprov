import type { Handler, HandlerEvent } from "@netlify/functions";
import { Db, ObjectId } from "mongodb";
import connectToDatabase from "../src/database";
import { Question } from "../src/models/Question";
import { verifyToken } from "../src/utils/auth";

// --- Main Handler ---

const handler: Handler = async (event: HandlerEvent) => {
    // Autentisering: Verifiera att användaren är en admin
    const decodedToken = verifyToken(event);
    if (!decodedToken || decodedToken.role !== 'admin') {
        return { statusCode: 403, body: JSON.stringify({ error: "Forbidden: Admin access required" }) };
    }

    // Endast GET-metoden tillåts för denna funktion
    if (event.httpMethod !== "GET") {
        return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
    }

    try {
        const { db } = await connectToDatabase();
        const subjectId = event.queryStringParameters?.subjectId;

        if (!subjectId) {
            return { statusCode: 400, body: JSON.stringify({ error: "subjectId query parameter is required" }) };
        }

        // Hämta alla questionId:n för det angivna subjectId
        const questions = await db.collection<Question>('questions')
            .find({ subjectId: new ObjectId(subjectId) }, { projection: { questionId: 1 } })
            .toArray();

        let maxNum = 0;
        const numberRegex = /(\d+)/; // Regex för att hitta en eller flera siffror

        if (questions.length > 0) {
            questions.forEach(q => {
                if (q.questionId) {
                    const match = q.questionId.match(numberRegex);
                    if (match) {
                        const currentNum = parseInt(match[1], 10);
                        if (!isNaN(currentNum) && currentNum > maxNum) {
                            maxNum = currentNum;
                        }
                    }
                }
            });
        }

        const nextIdNum = maxNum + 1;

        // 1. Hitta det högsta antalet siffror i ett existerande questionId
        let maxIdLength = 3; // Standardlängd om det inte finns några frågor
        questions.forEach(q => {
            if (q.questionId) {
                const numberPart = q.questionId.match(numberRegex);
                if (numberPart) {
                    const currentLength = numberPart[1].length;
                    if (currentLength > maxIdLength) {
                        maxIdLength = currentLength;
                    }
                }
            }
        });
        
        // 2. Använd den dynamiska längden för att pad:a det nya ID:t
        const nextIdString = nextIdNum.toString().padStart(maxIdLength, '0');

        return { statusCode: 200, body: JSON.stringify({ nextId: nextIdString }) };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
        console.error("Error in next-question-id handler:", error);
        return { statusCode: 500, body: JSON.stringify({ error: errorMessage }) };
    }
};

export { handler };