import type { Handler, HandlerEvent } from "@netlify/functions";
import { Db, ObjectId } from "mongodb";
import connectToDatabase from "../src/database";
import { User } from "../src/models/User";
import { verifyToken } from "../src/utils/auth";
import bcrypt from "bcryptjs";
import { auth } from "google-auth-library";

// --- Helper Functions for Examiner Management ---

async function getAllExaminers(db: Db, status?: string) {
    let filter: any = { role: 'examinator' };
    
    if (status === 'active') {
        filter.archived = { $ne: true }; // Using $ne to include users where archived is not set
    } else if (status === 'archived') {
        filter.archived = true;
    }
    
    const examiners = await db.collection<User>('users')
        .find(filter, { projection: { password: 0 } })
        .sort({ createdAt: -1 })
        .toArray();
    
    return examiners.map(examiner => ({
        authMethod: 'local', // Assuming all examiners use local auth
        email: undefined, // Examiners don't have email in this context
        userId: examiner._id,
        username: examiner.username,
        status: examiner.archived ? 'archived' : 'active',
        createdAt: examiner.createdAt,
        forcePasswordChange: examiner.forcePasswordChange
    }));
}

async function createNewExaminer(db: Db, username: string) {
    const existingUser = await db.collection<User>('users').findOne({ username });
    if (existingUser) {
        throw new Error("Username already exists");
    }
    
    const tempPassword = `${username}123`;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    
    const newExaminer: User = {
        username,
        password: hashedPassword,
        authMethod: 'local',
        role: 'examinator',
        createdAt: new Date(),
        archived: false,
        forcePasswordChange: true
    };
    
    const result = await db.collection<User>('users').insertOne(newExaminer);
    
    return {
        userId: result.insertedId,
        username: newExaminer.username,
        tempPassword
    };
}

async function archiveExaminer(db: Db, examinerId: ObjectId) {
    const result = await db.collection<User>('users').updateOne(
        { _id: examinerId, role: 'examinator' },
        { $set: { archived: true } }
    );
    
    if (result.matchedCount === 0) {
        throw new Error("Examiner not found");
    }
    
    return { message: "Examiner archived successfully" };
}

async function reactivateExaminer(db: Db, examinerId: ObjectId) {
    const result = await db.collection<User>('users').updateOne(
        { _id: examinerId, role: 'examinator' },
        { $set: { archived: false } }
    );
    
    if (result.matchedCount === 0) {
        throw new Error("Examiner not found");
    }
    
    return { message: "Examiner reactivated successfully" };
}

async function deleteExaminer(db: Db, examinerId: ObjectId) {
    const result = await db.collection<User>('users').deleteOne(
        { _id: examinerId, role: 'examinator' }
    );

    if (result.deletedCount === 0) {
        throw new Error("Examiner not found or already deleted");
    }

    return { message: "Examiner deleted permanently" };
}

async function resetExaminerPassword(db: Db, examinerId: ObjectId) {
    const examiner = await db.collection<User>('users').findOne({ _id: examinerId, role: 'examinator' });
    if (!examiner) {
        throw new Error("Examiner not found");
    }

    const tempPassword = `${examiner.username}123`;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    await db.collection<User>('users').updateOne(
        { _id: examinerId },
        { $set: { password: hashedPassword, forcePasswordChange: true } }
    );

    return { tempPassword };
}

// --- Main Handler ---

const handler: Handler = async (event: HandlerEvent) => {
    const decodedToken = verifyToken(event);
    if (!decodedToken || decodedToken.role !== 'admin') {
        return { statusCode: 403, body: JSON.stringify({ error: "Forbidden: Admin access required" }) };
    }

    try {
        const { db } = await connectToDatabase();
        const pathParts = event.path.split('/').filter(p => p);
        const examinerId = pathParts.length > 2 ? pathParts[2] : null;
        const action = pathParts.length > 3 ? pathParts[3] : null;

        if (event.httpMethod === "GET") {
            const status = event.queryStringParameters?.status;
            const examiners = await getAllExaminers(db, status);
            return { statusCode: 200, body: JSON.stringify(examiners) };
        }
        
        if (event.httpMethod === "POST") {
            const { username } = JSON.parse(event.body || '{}');
            if (!username) return { statusCode: 400, body: JSON.stringify({ error: "Username is required" }) };
            const result = await createNewExaminer(db, username);
            return { statusCode: 201, body: JSON.stringify(result) };
        }
        
        if (event.httpMethod === "PUT" && examinerId && action) {
            let result;
            if (action === 'archive') result = await archiveExaminer(db, new ObjectId(examinerId));
            else if (action === 'reactivate') result = await reactivateExaminer(db, new ObjectId(examinerId));
            else if (action === 'reset-password') result = await resetExaminerPassword(db, new ObjectId(examinerId));
            else return { statusCode: 404, body: JSON.stringify({ error: "Endpoint not found" }) };
            return { statusCode: 200, body: JSON.stringify(result) };
        }

        if (event.httpMethod === "DELETE" && examinerId) {
            const result = await deleteExaminer(db, new ObjectId(examinerId));
            return { statusCode: 200, body: JSON.stringify(result) };
        }
        
        return { statusCode: 404, body: JSON.stringify({ error: "Endpoint not found" }) };
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
        console.error("Error in admin-examiners handler:", error);
        
        if (errorMessage.includes("Username already exists")) {
            return { statusCode: 409, body: JSON.stringify({ error: errorMessage }) };
        }
        
        return { statusCode: 500, body: JSON.stringify({ error: errorMessage }) };
    }
};

export { handler };
