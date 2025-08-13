import type { Handler, HandlerEvent } from "@netlify/functions";
import { Db, ObjectId } from "mongodb";
import connectToDatabase from "../src/database";
import { verifyToken } from "../src/utils/auth";

const handler: Handler = async (event: HandlerEvent) => {
    const decodedToken = verifyToken(event);
    if (!decodedToken) {
        return { statusCode: 401, body: "Unauthorized" };
    }

    const pathParts = event.path.split('/').filter(p => p);
    const attemptId = pathParts.pop();

    if (event.httpMethod !== "GET" || !attemptId) {
        return { statusCode: 400, body: "Invalid request. Requires GET /api/attempts/{attemptId}" };
    }

    try {
        const { db } = await connectToDatabase();
        const studentId = new ObjectId(decodedToken.userId);

        const results = await db.collection('test_attempts').aggregate([
            // Hitta det specifika provförsöket
            { $match: { _id: new ObjectId(attemptId) } },
            // Konvertera answers.questionId till ObjectId
            {
            $addFields: {
                answers: {
                $map: {
                    input: "$answers",
                    as: "a",
                    in: {
                    $mergeObjects: [
                        "$$a",
                        {
                        questionIdObj: { $toObjectId: "$$a.questionId" }
                        }
                    ]
                    }
                }
                }
            }
            },
            {
            $lookup: {
                from: "questions",
                localField: "answers.questionIdObj",
                foreignField: "_id",
                as: "questionDetails"
            }
            }
        ]).toArray();

        if (results.length === 0) {
            return { statusCode: 404, body: "Test attempt not found." };
        }

        const result = results[0];

        // Authorization check: allow if user is examinator or the student who owns the attempt
        if (decodedToken.role !== 'examinator' && !result.studentId.equals(new ObjectId(decodedToken.userId))) {
            return { statusCode: 403, body: "Forbidden: You do not have permission to view this attempt." };
        }

        // Kombinera användarens svar med frågetexten för enklare hantering i frontend
        console.log("Result:", result);
        const detailedAnswers = result.answers.map((answer: any) => {
            const question = result.questionDetails.find((q: any) => q._id.equals(answer.questionIdObj));
            return {
                ...answer,
                questionText: question?.questionText || 'Fråga ej hittad',
                options: question?.options || [],
                correctOptionIndex: question?.correctOptionIndex
            };
        });

        const finalResult = {
            _id: result._id,
            testId: result.testId,
            studentId: result.studentId,
            score: result.score,
            passed: result.passed,
            submittedAt: result.submittedAt,
            submissionType: result.submissionType,
            detailedAnswers: detailedAnswers
        };

        return {
            statusCode: 200,
            body: JSON.stringify(finalResult),
            headers: { "Content-Type": "application/json" }
        };

    } catch (error) {
        console.error("Error fetching attempt details:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
    }
};

export { handler };