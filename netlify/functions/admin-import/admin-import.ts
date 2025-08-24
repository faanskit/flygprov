    import type { Handler, HandlerEvent } from "@netlify/functions";
import { Db, ObjectId } from "mongodb";
import connectToDatabase from "../src/database";
import { Question } from "../src/models/Question";
import { Subject } from "../src/models/Subject";
import { verifyToken } from "../src/utils/auth";
import { searchImageByName } from '../src/utils/google-drive';
import Papa from "papaparse";

interface CsvRow {
    code: string;
    qid: string;
    question: string;
    option_1: string;
    option_2: string;
    option_3: string;
    option_4: string;
    correct_option: string;
    active?: string;
    image?: string;
}

const handler: Handler = async (event: HandlerEvent) => {
    const decodedToken = verifyToken(event);
    if (!decodedToken || decodedToken.role !== 'admin') {
        return { statusCode: 403, body: JSON.stringify({ error: "Forbidden: Admin access required" }) };
    }

    const pathParts = event.path.split('/').filter(p => p);
    const action = pathParts[pathParts.length - 1];

    try {
        const { db } = await connectToDatabase();

        if (action === 'analyze' && event.httpMethod === 'POST') {
            return handleAnalyze(db, event.body || '');
        }

        if (action === 'execute' && event.httpMethod === 'POST') {
            return handleExecute(db, event.body || '');
        }

        return { statusCode: 404, body: JSON.stringify({ error: "Endpoint not found" }) };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
        console.error("Error in admin-import handler:", error);
        return { statusCode: 500, body: JSON.stringify({ error: errorMessage }) };
    }
};

async function handleAnalyze(db: Db, csvContent: string) {
    if (!csvContent) {
        return { statusCode: 400, body: JSON.stringify({ error: 'CSV content is empty' }) };
    }

    const subjects = await db.collection<Subject>('subjects').find().toArray();
    const subjectMap = new Map(subjects.map(s => [s.code, s._id]));

    const { data } = Papa.parse<CsvRow>(csvContent, { header: true, skipEmptyLines: true });

    const newQuestions: (Omit<Question, '_id'> & { imageName?: string; existingImageId?: string })[] = [];
    let duplicatesCount = 0;
    const existingImages = new Map<string, string>(); // filename -> Drive file ID
    const newImagesNeeded: string[] = [];

    // Collect unique image names and check existence
    const uniqueImageNames = new Set(data.filter(row => row.image).map(row => row.image!.trim()));
    for (const name of uniqueImageNames) {
        const driveId = await searchImageByName(name);
        if (driveId) {
            existingImages.set(name, driveId);
        } else {
            newImagesNeeded.push(name);
        }
    }

    for (const row of data) {
        if (!row.code || !row.qid || !row.question || !row.option_1 || !row.option_2 || !row.option_3 || !row.option_4 || !row.correct_option) {
            continue; // Skip incomplete rows
        }

        const subjectId = subjectMap.get(row.code);
        if (!subjectId) {
            continue; // Skip if subject code is invalid
        }

        const existingQuestion = await db.collection<Question>('questions').findOne({
            subjectId: subjectId,
            questionText: row.question.trim(),
        });

        if (existingQuestion) {
            duplicatesCount++;
        } else {
            newQuestions.push({
                subjectId: subjectId,
                questionId: row.qid.trim(),
                questionText: row.question.trim(),
                options: [row.option_1.trim(), row.option_2.trim(), row.option_3.trim(), row.option_4.trim()],
                correctOptionIndex: parseInt(row.correct_option, 10) - 1,
                active: row.active?.toLowerCase().trim() !== 'false',
                imageName: row.image?.trim(), // Store for frontend handling
                existingImageId: row.image ? existingImages.get(row.image.trim()) : undefined, // Pre-link if exists
            });
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ newQuestions, duplicatesCount, existingImages: Object.fromEntries(existingImages), newImagesNeeded }),
    };
}

async function handleExecute(db: Db, body: string) {
    const { questionsToImport } = JSON.parse(body);

    if (!questionsToImport || !Array.isArray(questionsToImport) || questionsToImport.length === 0) {
        return { statusCode: 400, body: JSON.stringify({ error: 'No questions to import' }) };
    }

    const questionsWithObjectId = questionsToImport.map(q => ({
        subjectId: new ObjectId(q.subjectId),
        questionId: q.questionId,
        questionText: q.questionText,
        options: q.options,
        correctOptionIndex: q.correctOptionIndex,
        active: q.active,
        imageId: q.imageId, // Include imageId if provided
    }));

    const result = await db.collection<Question>('questions').insertMany(questionsWithObjectId);

    return {
        statusCode: 201,
        body: JSON.stringify({ insertedCount: result.insertedCount }),
    };
}
export { handler };
