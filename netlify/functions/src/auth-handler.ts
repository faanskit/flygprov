import connectToDatabase from './database';
import { User } from './models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function login(body: string | null): Promise<{ token: string; user: { username: string; role: string } }> {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is not set.');
    }

    if (!body) {
        const error: any = new Error("Request body is missing");
        error.statusCode = 400;
        throw error;
    }

    const { username, password } = JSON.parse(body);

    if (!username || !password) {
        const error: any = new Error("Username and password are required");
        error.statusCode = 400;
        throw error;
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection<User>('users');

    const user = await usersCollection.findOne({ username });

    if (!user || !user.password) {
        const error: any = new Error("Invalid credentials");
        error.statusCode = 401; // Unauthorized
        throw error;
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
        const error: any = new Error("Invalid credentials");
        error.statusCode = 401; // Unauthorized
        throw error;
    }

    const token = jwt.sign(
        { userId: user._id, role: user.role },
        JWT_SECRET,
        { expiresIn: '8h' } // Token is valid for 8 hours
    );

    return {
        token,
        user: {
            username: user.username,
            role: user.role,
        },
    };
}
