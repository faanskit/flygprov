import dotenv from 'dotenv';
import { resolve } from 'path';
import fs from 'fs';
import csv from 'csv-parser';
import connectToDatabase from './database';
import { Subject } from './models/Subject';
import { Question } from './models/Question';

// Ladda .env från roten
dotenv.config({ path: resolve(__dirname, '../../.env') });

const csvFilePath = process.argv[2];
if (!csvFilePath) {
  console.error('Ange sökväg till CSV-fil som första argument.');
  process.exit(1);
}

async function main() {
  const { db, client } = await connectToDatabase();

  try {
    // Hämta alla ämnen och skapa en lookup på code
    const subjects = await db.collection<Subject>('subjects').find().toArray();
    if (subjects.length === 0) {
        throw new Error("No subjects found. Please run the main seed script (db:seed) first.");
    }
    const codeToSubjectId: Record<string, any> = {};
    for (const subj of subjects) {
        if (subj.code) codeToSubjectId[subj.code] = subj._id;
    }

    const questionsToInsert: any[] = [];

    // Läs och parsa CSV
    fs.createReadStream(resolve(csvFilePath))
      .pipe(csv(['code', 'question', 'option_1', 'option_2', 'option_3', 'option_4', 'correct_option']))
      .on('data', (row) => {
        const code = row.code.replace(/"/g, '').trim();
        const subjectId = codeToSubjectId[code];
        if (!subjectId) {
            console.warn(`Hittar inget subjectId för code: ${code}, hoppar över rad.`);
            return;
        }
        const options = [
            row.option_1.replace(/"/g, '').trim(),
            row.option_2.replace(/"/g, '').trim(),
            row.option_3.replace(/"/g, '').trim(),
            row.option_4.replace(/"/g, '').trim(),
        ];
        const correctOptionIndex = parseInt(row.correct_option, 10) - 1; // 1-baserad till 0-baserad
        if (options[correctOptionIndex]) {
            options[correctOptionIndex] += ' - rätt svar';
        }
        questionsToInsert.push({
            subjectId,
            questionText: row.question.replace(/"/g, '').trim(),
            options,
            correctOptionIndex,
            active: true // Alla frågor är aktiva som standard
        });
      })
      .on('end', async () => {
        if (questionsToInsert.length === 0) {
            console.log('Inga frågor att lägga till.');
            await client.close();
            process.exit(0);
        }
        try {
            await db.collection<Question>('questions').insertMany(questionsToInsert);
            console.log(`Lade till ${questionsToInsert.length} frågor.`);
        } catch (err) {
            console.error('Fel vid insertMany:', err);
        }
        await client.close();
        process.exit(0);
      });
  } catch (err) {
    console.error(err);
    await client.close();
    process.exit(1);
  }
}

main();