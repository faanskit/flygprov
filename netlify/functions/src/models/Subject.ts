import { ObjectId } from 'mongodb';

export interface Subject {
    _id?: ObjectId;
    name: string;
    code: string;
    description: string;
    defaultTimeLimitMinutes: number;
}

