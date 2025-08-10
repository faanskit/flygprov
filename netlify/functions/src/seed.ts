// netlify/functions/src/seed.ts
import dotenv from 'dotenv';
import { resolve } from 'path';
import { ObjectId } from 'mongodb';

// Ladda miljövariabler från .env i projektets rot
dotenv.config({ path: resolve(__dirname, '../../../.env') });

import connectToDatabase from './database';
import { User } from './models/User';
import { Subject } from './models/Subject';
import { TestAttempt } from './models/TestAttempt';
import bcrypt from 'bcryptjs';

const subjectsData: Omit<Subject, '_id'>[] = [
    { name: 'Luftfartsrätt och bestämmelser', code: 'LAW', description: 'Omfattar nationella och internationella luftfartsregler.' },
    { name: 'Allmän flygplanslära', code: 'AGK', description: 'Behandlar flygplanets konstruktion, system, instrument och motorer.' },
    { name: 'Flygningens grundprinciper', code: 'POF', description: 'Fokuserar på aerodynamik.' },
    { name: 'Prestanda och färdplanering', code: 'FPP', description: 'Inkluderar beräkningar av start- och landningssträckor.' },
    { name: 'Människans prestationsförmåga', code: 'HPL', description: 'Tar upp de fysiologiska och psykologiska aspekterna av flygning.' },
    { name: 'Meteorologi', code: 'MET', description: 'Ger kunskap om väderfenomen.' },
    { name: 'Navigation', code: 'NAV', description: 'Omfattar metoder för att bestämma ett flygplans position.' },
    { name: 'Operativa procedurer', code: 'OP', description: 'Behandlar de standardprocedurer som används under en flygning.' },
    { name: 'Kommunikation', code: 'COM', description: 'Fokuserar på fraseologi och procedurer för radiokommunikation.' }
];


async function seedDatabase() {
    console.log('Starting database seed...');

    if (!process.env.MONGO_URI) {
        console.error('MONGO_URI is not defined in your .env file.');
        process.exit(1);
    }

    const { db, client } = await connectToDatabase();
    
    // --- Seed Users ---
    const usersCollection = db.collection<User>('users');
    await usersCollection.deleteMany({ username: 'student' });
    const hashedPassword = await bcrypt.hash('password', 10);
    const studentUser: User = {
        username: 'student',
        password: hashedPassword,
        role: 'student',
        createdAt: new Date(),
        archived: false,
    };
    const studentResult = await usersCollection.insertOne(studentUser);
    const studentId = studentResult.insertedId;
    console.log(`Created student user with ID: ${studentId}`);

    // --- Seed Subjects ---
    const subjectsCollection = db.collection<Subject>('subjects');
    await subjectsCollection.deleteMany({});
    const subjectInsertResult = await subjectsCollection.insertMany(subjectsData);
    console.log(`Inserted ${subjectInsertResult.insertedCount} subjects.`);
    const subjects = await subjectsCollection.find().toArray();
    const metSubject = subjects.find(s => s.code === 'MET');
    const lawSubject = subjects.find(s => s.code === 'LAW');

    if (!metSubject || !lawSubject) {
        throw new Error("Could not find required subjects for seeding attempts.");
    }

    // --- Seed Test Attempts for the student ---
    const testAttemptsCollection = db.collection<TestAttempt>('test_attempts');
    await testAttemptsCollection.deleteMany({ studentId: studentId });

    const attempts: Omit<TestAttempt, '_id'>[] = [
        // 1. Ett underkänt försök i Meteorologi
        {
            testId: new ObjectId(),
            studentId: studentId,
            subjectId: metSubject._id,
            answers: [], // Förenklat för seed
            startTime: new Date(),
            endTime: new Date(),
            score: 12,
            passed: false,
            submittedAt: new Date()
        },
        // 2. Ett godkänt försök i Luftfartsrätt
        {
            testId: new ObjectId(),
            studentId: studentId,
            subjectId: lawSubject._id,
            answers: [], // Förenklat för seed
            startTime: new Date(),
            endTime: new Date(),
            score: 18,
            passed: true,
            submittedAt: new Date()
        }
    ];
    
    if (attempts.length > 0) {
        await testAttemptsCollection.insertMany(attempts);
        console.log(`Inserted ${attempts.length} test attempts for student.`);
    }

    console.log('\nSeed complete!');
    console.log(`You can log in with:\nUsername: student\nPassword: password`);

    await client.close();
    console.log('Database connection closed.');
}

seedDatabase().catch(error => {
    console.error('Error seeding database:', error);
    process.exit(1);
});
