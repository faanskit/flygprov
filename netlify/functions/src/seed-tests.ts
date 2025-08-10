// netlify/functions/src/seed-tests.ts
import dotenv from 'dotenv';
import { resolve } from 'path';
import { ObjectId } from 'mongodb';

dotenv.config({ path: resolve(__dirname, '../../../.env') });

import connectToDatabase from './database';
import { Test } from './models/Test';
import { Question } from './models/Question';
import { Subject } from './models/Subject';

async function seedTests() {
    console.log('Starting test data seed...');

    if (!process.env.MONGO_URI) {
        console.error('MONGO_URI is not defined in your .env file.');
        process.exit(1);
    }

    const { db, client } = await connectToDatabase();

    // Hämta befintliga collections
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

    // Rensa gamla testdata för MET
    const oldTests = await testsCollection.find({ subjectId: metSubject._id }).toArray();
    const oldTestIds = oldTests.map(t => t._id!);
    if (oldTestIds.length > 0) {
        await questionsCollection.deleteMany({ _id: { $in: oldTests.flatMap(t => t.questionIds) } });
        await testsCollection.deleteMany({ _id: { $in: oldTestIds } });
        console.log(`Removed ${oldTests.length} old test(s) and their questions for subject MET.`);
    }

    // --- Skapa Frågor ---
    const questionsData: Omit<Question, '_id'>[] = [
        {
            subjectId: metSubject._id,
            questionText: 'Vilken typ av moln är oftast förknippad med åska?',
            options: ['Cirrus', 'Cumulonimbus', 'Stratus', 'Altocumulus'],
            correctOptionIndex: 1,
        },
        {
            subjectId: metSubject._id,
            questionText: 'Vad mäter en barometer?',
            options: ['Vindhastighet', 'Luftfuktighet', 'Lufttryck', 'Temperatur'],
            correctOptionIndex: 2,
        }
    ];

    // Lägg till 18 placeholder-frågor
    for (let i = 3; i <= 20; i++) {
        questionsData.push({
            subjectId: metSubject._id,
            questionText: `Detta är placeholder-fråga ${i}. Vad är rätt svar?`,
            options: [`Svar A för fråga ${i}`, `Svar B för fråga ${i}`, `Svar C för fråga ${i}`, `Svar D för fråga ${i}`],
            correctOptionIndex: 0, // Sätt ett godtyckligt rätt svar
        });
    }

    const questionInsertResult = await questionsCollection.insertMany(questionsData);
    console.log(`Inserted ${questionInsertResult.insertedCount} new questions.`);
    const questionIds = Object.values(questionInsertResult.insertedIds);

    // --- Skapa Prov ---
    const testData: Omit<Test, '_id'> = {
        name: 'Grundläggande Meteorologi Prov 1',
        description: 'Ett grundläggande prov om meteorologiska koncept.',
        subjectId: metSubject._id,
        questionIds: questionIds,
        timeLimitMinutes: 10,
        createdAt: new Date(),
        createdBy: new ObjectId(), // System/Admin ID
    };

    const testInsertResult = await testsCollection.insertOne(testData);
    console.log(`Inserted 1 new test with ID: ${testInsertResult.insertedId}`);

    console.log('\nTest data seed complete!');
    await client.close();
}

seedTests().catch(error => {
    console.error('Error seeding test data:', error);
    process.exit(1);
});
