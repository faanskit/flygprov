import jwt from 'jsonwebtoken';
import type { HandlerEvent } from "@netlify/functions";

const JWT_SECRET = process.env.JWT_SECRET;

export interface DecodedToken {
    sub: string; // Google-kompatibel, samma som userId
    userId: string;
    username?: string; //Google-användare har inte username
    email?: string; // Google-användare har email
    name?: string; // fullständigt namn
    given_name?: string; // förnamn
    family_name?: string; // efternamn
    picture?: string; // profilbild URL
    authMethod: 'local' | 'google';
    role: string;
    iat: number;
    exp: number;
}

export function verifyToken(event: HandlerEvent): DecodedToken | null {
    if (!JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is not set.');
    }

    const authHeader = event.headers['authorization'];
    if (!authHeader) {
        return null;
    }

    const token = authHeader.split(' ')[1]; // Bearer <token>
    if (!token) {
        return null;
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
        return decoded;
    } catch (error) {
        console.error("Invalid token", error);
        return null;
    }
}
