// netlify/functions/src/seed-tests.ts
import dotenv from 'dotenv';
import { resolve } from 'path';
import connectToDatabase from './database';
import { Subject } from './models/Subject';
import { Question } from './models/Question';

// Ladda .env från roten
dotenv.config({ path: resolve(__dirname, '../../.env') });

async function seedAllQuestions() {
    console.log('Starting seed for questions across ALL subjects...');

    if (!process.env.MONGO_URI) {
        console.error('MONGO_URI is not defined in your .env file.');
        process.exit(1);
    }

    const { db, client } = await connectToDatabase();
    
    try {
        const subjects = await db.collection<Subject>('subjects').find().toArray();
        if (subjects.length === 0) {
            throw new Error("No subjects found. Please run the main seed script (db:seed) first.");
        }

        // Rensa ALLA gamla frågor för att undvika dubbletter och fel
        await db.collection<Question>('questions').deleteMany({});
        console.log('Successfully removed all old questions.');

        for (const subject of subjects) {
            const questions: Omit<Question, '_id'>[] = [];
            for (let i = 1; i <= 50; i++) { // Skapa 50 frågor per ämne
                questions.push({
                    subjectId: subject._id!,
                    questionText: `Detta är fråga #${i} för ämnet ${subject.name}. Vad är det korrekta svaret?`,
                    options: [
                        `Svarsalternativ A för fråga ${i}`,
                        `Svarsalternativ B för fråga ${i}`,
                        `Svarsalternativ C för fråga ${i}`,
                        `Svarsalternativ D för fråga ${i}`
                    ],
                    correctOptionIndex: i % 4
                });
            }
            await db.collection<Question>('questions').insertMany(questions);
            console.log(`-> Inserted 50 new questions for subject: ${subject.code}`);
        }

        console.log('\nQuestion seed complete for all subjects!');

    } catch (error) {
        console.error('An error occurred during the question seed process:', error);
    } finally {
        await client.close();
        console.log('Database connection closed.');
    }
}

seedAllQuestions();