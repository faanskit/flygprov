import { ObjectId } from 'mongodb';

export interface Question {
    _id?: ObjectId;
    subjectId: ObjectId;
    questionText: string;
    options: [string, string, string, string];
    correctOptionIndex: number; // 0-3
}
