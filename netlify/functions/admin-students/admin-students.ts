import type { Handler, HandlerEvent } from "@netlify/functions";
import { Db, ObjectId } from "mongodb";
import connectToDatabase from "../src/database";
import { User } from "../src/models/User";
import { verifyToken } from "../src/utils/auth";
import bcrypt from "bcryptjs";

// --- Helper Functions for Student Management ---

async function getAllStudents(db: Db, status?: string) {
    let filter: any = { role: 'student' };
    
    if (status === 'active') {
        filter.archived = { $ne: true };
    } else if (status === 'archived') {
        filter.archived = true;
    }
    
    const students = await db.collection<User>('users')
        .find(filter, { projection: { password: 0 } })
        .sort({ createdAt: -1 })
        .toArray();
    
    return students.map(student => ({
        userId: student._id,
        username: student.username,
        status: student.archived ? 'archived' : 'active',
        createdAt: student.createdAt,
        forcePasswordChange: student.forcePasswordChange
    }));
}

async function createNewStudent(db: Db, username: string) {
    const existingUser = await db.collection<User>('users').findOne({ username });
    if (existingUser) {
        throw new Error("Username already exists");
    }
    
    const tempPassword = `${username}123`;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    
    const newStudent: User = {
        username,
        password: hashedPassword,
        role: 'student',
        createdAt: new Date(),
        archived: false,
        forcePasswordChange: true
    };
    
    const result = await db.collection<User>('users').insertOne(newStudent);
    
    return {
        userId: result.insertedId,
        username: newStudent.username,
        tempPassword
    };
}

async function archiveStudent(db: Db, studentId: ObjectId) {
    const result = await db.collection<User>('users').updateOne(
        { _id: studentId, role: 'student' },
        { $set: { archived: true } }
    );
    if (result.matchedCount === 0) throw new Error("Student not found");
    return { message: "Student archived successfully" };
}

async function reactivateStudent(db: Db, studentId: ObjectId) {
    const result = await db.collection<User>('users').updateOne(
        { _id: studentId, role: 'student' },
        { $set: { archived: false } }
    );
    if (result.matchedCount === 0) throw new Error("Student not found");
    return { message: "Student reactivated successfully" };
}

async function deleteStudent(db: Db, studentId: ObjectId) {
    const result = await db.collection<User>('users').deleteOne(
        { _id: studentId, role: 'student' }
    );
    if (result.deletedCount === 0) throw new Error("Student not found or already deleted");
    return { message: "Student deleted permanently" };
}

async function resetStudentPassword(db: Db, studentId: ObjectId) {
    const student = await db.collection<User>('users').findOne({ _id: studentId, role: 'student' });
    if (!student) throw new Error("Student not found");

    const tempPassword = `${student.username}123`;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    await db.collection<User>('users').updateOne(
        { _id: studentId },
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
        const studentId = pathParts.length > 2 ? pathParts[2] : null;
        const action = pathParts.length > 3 ? pathParts[3] : null;

        if (event.httpMethod === "GET") {
            const status = event.queryStringParameters?.status;
            const students = await getAllStudents(db, status);
            return { statusCode: 200, body: JSON.stringify(students) };
        }
        
        if (event.httpMethod === "POST") {
            const { username } = JSON.parse(event.body || '{}');
            if (!username) return { statusCode: 400, body: JSON.stringify({ error: "Username is required" }) };
            const result = await createNewStudent(db, username);
            return { statusCode: 201, body: JSON.stringify(result) };
        }
        
        if (event.httpMethod === "PUT" && studentId && action) {
            let result;
            if (action === 'archive') result = await archiveStudent(db, new ObjectId(studentId));
            else if (action === 'reactivate') result = await reactivateStudent(db, new ObjectId(studentId));
            else if (action === 'reset-password') result = await resetStudentPassword(db, new ObjectId(studentId));
            else return { statusCode: 404, body: JSON.stringify({ error: "Endpoint not found" }) };
            return { statusCode: 200, body: JSON.stringify(result) };
        }

        if (event.httpMethod === "DELETE" && studentId) {
            const result = await deleteStudent(db, new ObjectId(studentId));
            return { statusCode: 200, body: JSON.stringify(result) };
        }
        
        return { statusCode: 404, body: JSON.stringify({ error: "Endpoint not found" }) };
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
        console.error("Error in admin-students handler:", error);
        
        if (errorMessage.includes("Username already exists")) {
            return { statusCode: 409, body: JSON.stringify({ error: errorMessage }) };
        }
        
        return { statusCode: 500, body: JSON.stringify({ error: errorMessage }) };
    }
};

export { handler };
