import { ObjectId } from 'mongodb';

export interface User {
    _id?: ObjectId;
    username: string;
    password?: string; // Password should be optional as it will be stripped out
    role: 'student' | 'examinator' | 'administrator';
    createdAt: Date;
    archived: boolean;
    forcePasswordChange: boolean;
}
