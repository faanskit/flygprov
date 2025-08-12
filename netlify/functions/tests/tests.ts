import type { Handler, HandlerEvent } from "@netlify/functions";
import { Db, ObjectId } from "mongodb";
import connectToDatabase from "../src/database";
import { Test } from "../src/models/Test";
import { Question } from "../src/models/Question";
import { TestAttempt } from "../src/models/TestAttempt";
import { verifyToken } from "../src/utils/auth";

const handleStartTest = async (db: Db, testId: string, studentId: ObjectId) => {
    const test = await db.collection<Test>('tests').findOne({ _id: new ObjectId(testId) });
    if (!test) {
        return { statusCode: 404, body: "Test not found" };
    }

    const questions = await db.collection<Question>('questions').find({
        _id: { $in: test.questionIds }
    }).toArray();

    const newAttempt: Omit<TestAttempt, '_id'> = {
        testId: test._id!,
        studentId: studentId,
        subjectId: test.subjectId,
        answers: [],
        startTime: new Date(),
        endTime: null!,
        score: 0,
        passed: false,
        submittedAt: null!,
    };

    const attemptsCollection = db.collection<TestAttempt>('test_attempts');
    const insertResult = await attemptsCollection.insertOne(newAttempt);
    const attemptId = insertResult.insertedId;

    return {
        statusCode: 200,
        body: JSON.stringify({
            attemptId: attemptId,
            testName: test.name,
            timeLimitMinutes: test.timeLimitMinutes,
            questions: questions.map(({ _id, questionText, options }) => ({ _id, questionText, options }))
        }),
        headers: { "Content-Type": "application/json" }
    };
};

const handleSubmitTest = async (db: Db, attemptId: string, studentId: ObjectId, submittedAnswers: any[]) => {
    const attemptsCollection = db.collection<TestAttempt>('test_attempts');
    const attempt = await attemptsCollection.findOne({ _id: new ObjectId(attemptId) });

    if (!attempt) {
        return { statusCode: 404, body: "Test attempt not found." };
    }
    if (!attempt.studentId.equals(studentId)) {
        return { statusCode: 403, body: "Forbidden: You cannot submit this test." };
    }
    if (attempt.submittedAt) {
        return { statusCode: 400, body: "This test has already been submitted." };
    }

    const test = await db.collection<Test>('tests').findOne({ _id: attempt.testId });
    if (!test) return { statusCode: 404, body: "Associated test not found." };

    const questions = await db.collection<Question>('questions').find({ _id: { $in: test.questionIds } }).toArray();
    
    let score = 0;
    const gradedAnswers = submittedAnswers.map(userAnswer => {
        const question = questions.find(q => q._id.equals(userAnswer.questionId));
        const isCorrect = question ? question.correctOptionIndex === userAnswer.selectedOptionIndex : false;
        if (isCorrect) {
            score++;
        }
        return { ...userAnswer, isCorrect };
    });

    // Godkäntgräns: 75% (15/20)
    const passed = score >= 15;

    await attemptsCollection.updateOne(
        { _id: new ObjectId(attemptId) },
        {
            $set: {
                answers: gradedAnswers,
                score: score,
                passed: passed,
                endTime: new Date(),
                submittedAt: new Date()
            }
        }
    );

    return {
        statusCode: 200,
        body: JSON.stringify({ message: "Test submitted successfully", attemptId })
    };
};


const handler: Handler = async (event: HandlerEvent, context) => {
    const decodedToken = verifyToken(event);
    if (!decodedToken || decodedToken.role !== 'student') {
        return { statusCode: 401, body: "Unauthorized" };
    }

    const pathParts = event.path.split('/');
    const action = pathParts.pop(); // 'start' or 'submit'
    const id = pathParts.pop(); // testId or attemptId

    if (!id || !action) {
        return { statusCode: 400, body: "Invalid request path." };
    }

    try {
        const { db } = await connectToDatabase();
        const studentId = new ObjectId(decodedToken.userId);

        if (event.httpMethod === "GET" && action === 'start') {
            return handleStartTest(db, id, studentId);
        }

        if (event.httpMethod === "POST" && action === 'submit') {
            const body = JSON.parse(event.body || '{}');
            return handleSubmitTest(db, id, studentId, body.answers);
        }

        return { statusCode: 405, body: "Method or action not allowed." };

    } catch (error) {
        console.error("Error in tests handler:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
    }
};

export { handler };
