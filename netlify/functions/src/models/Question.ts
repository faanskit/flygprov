import { ObjectId } from 'mongodb';

export interface Question {
    _id?: ObjectId;
    subjectId: ObjectId;
    questionId?: string; // Externarl ID for reference
    questionText: string;
    options: [string, string, string, string];
    correctOptionIndex: number; // 0-3
    imageId?: string;
    active: boolean; // true if the question is active, false if it is deactivated
}
