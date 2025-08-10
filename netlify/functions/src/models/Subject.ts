import { ObjectId } from 'mongodb';

export interface Subject {
    _id?: ObjectId;
    name: string; // E.g., "Meteorologi"
    code: string; // E.g., "MET"
    description: string;
}
