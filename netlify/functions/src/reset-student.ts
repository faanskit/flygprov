import connectToDatabase from './database';
import { ObjectId } from 'mongodb';

// Hårdkodat användarnamn för teststudenten som ska nollställas.
const STUDENT_USERNAME_TO_RESET = 'student';

async function resetStudent() {
    console.log(`Påbörjar nollställning för student: ${STUDENT_USERNAME_TO_RESET}...`);
    let client;

    try {
        const { db, client: connectedClient } = await connectToDatabase();
        client = connectedClient;

        // 1. Hitta studenten
        const student = await db.collection('users').findOne({ username: STUDENT_USERNAME_TO_RESET });
        if (!student) {
            console.error(`Fel: Student med användarnamn "${STUDENT_USERNAME_TO_RESET}" hittades inte.`);
            return;
        }
        const studentId = student._id;
        console.log(`Hittade student med ID: ${studentId}`);

        // 2. Ta bort alla provförsök (test_attempts) för denna student
        const attemptsResult = await db.collection('test_attempts').deleteMany({ studentId: studentId });
        console.log(`Tog bort ${attemptsResult.deletedCount} provförsök.`);

        // 3. Ta bort alla prov (tests) som tilldelats denna student
        // Detta antar att proven är unika per student, enligt det nuvarande flödet.
        const testsResult = await db.collection('tests').deleteMany({ assignedStudentIds: studentId });
        console.log(`Tog bort ${testsResult.deletedCount} tilldelade prov.`);

        console.log('Studenten har nollställts!');

    } catch (error) {
        console.error('Ett fel inträffade under nollställningen:', error);
    } finally {
        // Stäng anslutningen för att säkerställa att skriptet avslutas korrekt.
        if (client) {
            await client.close();
        }
        process.exit(0);
    }
}

resetStudent();
