import type { Handler, HandlerEvent } from "@netlify/functions";
import { Db, ObjectId } from "mongodb";
import connectToDatabase from "../src/database";
import { User } from "../src/models/User";
import { Subject } from "../src/models/Subject";
import { TestAttempt } from "../src/models/TestAttempt";
import { Question } from "../src/models/Question";
import { verifyToken } from "../src/utils/auth";

// --- Helper Functions ---

async function getStudentOverview(db: Db) {
    const students = await db.collection<User>('users').find({ role: 'student' }, { projection: { password: 0 } }).toArray();
    const subjects = await db.collection<Subject>('subjects').find().toArray();
    const allAttempts = await db.collection<TestAttempt>('test_attempts').find({}).toArray();
    return students.map(student => {
        const studentAttempts = allAttempts.filter(a => a.studentId.equals(student._id!));
        let passedSubjectsCount = 0;
        subjects.forEach(subject => {
            if (studentAttempts.some(a => a.subjectId.equals(subject._id!) && a.passed)) {
                passedSubjectsCount++;
            }
        });
        return { studentId: student._id, username: student.username, passedSubjects: passedSubjectsCount, totalSubjects: subjects.length };
    });
}

async function getStudentDetails(db: Db, studentId: ObjectId) {
    const student = await db.collection<User>('users').findOne({ _id: studentId }, { projection: { password: 0 }});
    if (!student) throw new Error("Student not found");

    const subjects = await db.collection<Subject>('subjects').find().toArray();
    const attempts = await db.collection<TestAttempt>('test_attempts').find({ studentId }).toArray();
    const assignedTests = await db.collection('tests').find({ assignedStudentIds: studentId }).toArray();

    const details = subjects.map(subject => {
        const subjectAttempts = attempts.filter(a => a.subjectId.equals(subject._id!));
        const hasPassed = subjectAttempts.some(a => a.passed);
        const bestScore = subjectAttempts.length > 0 ? Math.max(...subjectAttempts.map(a => a.score)) : null;
        
        // Finns det ett tilldelat prov för detta ämne som inte har några försök än?
        const isAssignedAndNotStarted = assignedTests.some(t => t.subjectId.equals(subject._id!) && !attempts.some(a => a.testId.equals(t._id!)));

        let status = 'not_started';
        if (hasPassed) {
            status = 'passed';
        } else if (isAssignedAndNotStarted) {
            status = 'assigned'; // Ny status!
        } else if (subjectAttempts.length > 0) {
            status = 'in_progress';
        }

        return { 
            subjectId: subject._id, 
            subjectName: subject.name, 
            status, 
            attemptsCount: subjectAttempts.length, 
            bestScore: bestScore !== null ? `${bestScore}/20` : null 
        };
    });
    return { student, details };
}

async function createTestSession(db: Db, subjectId: ObjectId) {
    const questions = await db.collection<Question>('questions').aggregate([
        { $match: { subjectId: subjectId } },
        { $sample: { size: 20 } }
    ]).toArray();
    if (questions.length < 20) throw new Error(`Not enough questions in the database for subject ${subjectId}. Found only ${questions.length}.`);
    return { questions };
}

async function replaceQuestion(db: Db, subjectId: ObjectId, excludeIds: string[]) {
    const questions = await db.collection<Question>('questions').aggregate([
        { $match: { 
            subjectId: subjectId,
            _id: { $nin: excludeIds.map(id => new ObjectId(id)) } // Exkludera befintliga frågor
        }},
        { $sample: { size: 1 } }
    ]).toArray();

    if (questions.length === 0) {
        throw new Error("No more unique questions available in the database for this subject.");
    }
    return questions[0];
}

// --- Main Handler ---

const handler: Handler = async (event: HandlerEvent, context) => {
    const decodedToken = verifyToken(event);
    if (!decodedToken || decodedToken.role !== 'examinator') {
        return { statusCode: 403, body: "Forbidden" };
    }

    try {
        const { db } = await connectToDatabase();
        
        if (event.httpMethod === "GET") {
            const pathParts = event.path.split('/').filter(p => p);
            const studentId = pathParts.length > 2 ? pathParts[pathParts.length - 1] : null;
            const data = studentId ? await getStudentDetails(db, new ObjectId(studentId)) : await getStudentOverview(db);
            return { statusCode: 200, body: JSON.stringify(data) };
        }

        if (event.httpMethod === "POST") {
            const body = JSON.parse(event.body || '{}');
            const { action, studentId, subjectId, excludeIds } = body;

            if (action === 'create-test-session') {
                if (!subjectId) return { statusCode: 400, body: "subjectId is required." };
                const data = await createTestSession(db, new ObjectId(subjectId));
                return { statusCode: 200, body: JSON.stringify(data) };
            }
            
            if (action === 'replace-question') {
                if (!subjectId || !excludeIds) return { statusCode: 400, body: "subjectId and excludeIds are required." };
                const data = await replaceQuestion(db, new ObjectId(subjectId), excludeIds);
                return { statusCode: 200, body: JSON.stringify(data) };
            }

            return { statusCode: 400, body: "Invalid action." };
        }

        return { statusCode: 405, body: "Method Not Allowed" };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
        console.error("Error in examinator handler:", error);
        return { statusCode: 500, body: JSON.stringify({ error: errorMessage }) };
    }
};

export { handler };
