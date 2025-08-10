import { ObjectId } from 'mongodb';

export interface TestAttempt {
    _id?: ObjectId;
    testId: ObjectId;
    studentId: ObjectId;
    subjectId: ObjectId; // Denormalized for easier querying
    answers: {
        questionId: ObjectId;
        selectedOptionIndex: number; // -1 if unanswered
        isCorrect: boolean;
    }[];
    startTime: Date;
    endTime: Date;
    score: number; // Number of correct answers
    passed: boolean;
    submittedAt: Date;
}
