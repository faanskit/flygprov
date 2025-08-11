import { ObjectId } from 'mongodb';

export interface Test {
    _id?: ObjectId;
    name: string;
    description: string;
    subjectId: ObjectId;
    questionIds: ObjectId[];
    timeLimitMinutes: number;
    createdAt: Date;
    createdBy: ObjectId; // Examinator's ObjectId
    assignedStudentIds: ObjectId[]; // Students assigned to this test
}
