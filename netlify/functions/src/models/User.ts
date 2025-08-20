import { ObjectId } from 'mongodb';

export interface User {
    _id?: ObjectId;
    username: string; // För local: Användarnamn. För google: Sätts till email eller auto-genereras.
    password?: string; // Password should be optional as it will be stripped out
    email?: string;    // Obligatoriskt för google, valfritt för local
    authMethod: 'local' | 'google';  // Ny flagga
    googleSub?: string;  // Google's unika ID (från OAuth payload), för verifiering
    role: 'student' | 'examinator' | 'administrator';
    createdAt: Date;
    archived: boolean;
    forcePasswordChange: boolean; // Endast relevant för local
}
