// netlify/functions/src/seed-tests.ts
import dotenv from 'dotenv';
import { resolve } from 'path';
import { ObjectId } from 'mongodb';

dotenv.config({ path: resolve(__dirname, '../../../.env') });

import connectToDatabase from './database';
import { Question } from './models/Question';
import { Subject } from './models/Subject';
import { Test } from './models/Test';

async function seedExtraQuestions() {
    console.log('Starting extra questions seed...');

    if (!process.env.MONGO_URI) {
        console.error('MONGO_URI is not defined in your .env file.');
        process.exit(1);
    }

    const { db, client } = await connectToDatabase();

    const subjectsCollection = db.collection<Subject>('subjects');
    const questionsCollection = db.collection<Question>('questions');
    const testsCollection = db.collection<Test>('tests');

    // Hitta ämnet "Meteorologi"
    const metSubject = await subjectsCollection.findOne({ code: 'MET' });
    if (!metSubject) {
        console.error('Subject with code MET not found. Please seed base data first.');
        await client.close();
        return;
    }

    // Rensa ALLA gamla testdata för MET för att undvika dubbletter
    const oldTests = await testsCollection.find({ subjectId: metSubject._id }).toArray();
    if (oldTests.length > 0) {
        await testsCollection.deleteMany({ subjectId: metSubject._id });
        console.log(`Removed ${oldTests.length} old test(s) for subject MET.`);
    }
    await questionsCollection.deleteMany({ subjectId: metSubject._id });
    console.log('Removed all old questions for subject MET.');
    
    // --- Skapa en större frågebank ---
    const questionsData: Omit<Question, '_id'>[] = [];
    for (let i = 1; i <= 50; i++) {
        questionsData.push({
            subjectId: metSubject._id,
            questionText: `Meteorologi fråga #${i}: Vad är en front?`,
            options: [`Gränsen mellan två städer`, `Gränsen mellan två luftmassor`, `En typ av moln`, `Ett högtryckssystem`],
            correctOptionIndex: 1,
        });
    }

    const questionInsertResult = await questionsCollection.insertMany(questionsData);
    console.log(`Inserted ${questionInsertResult.insertedCount} new questions for MET.`);
    
    console.log('\nExtra questions seed complete!');
    await client.close();
}

seedExtraQuestions().catch(error => {
    console.error('Error seeding extra questions:', error);
    process.exit(1);
});