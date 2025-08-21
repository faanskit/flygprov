import connectToDatabase from './database';
import bcrypt from 'bcryptjs';

// Hårdkodat användarnamn för admin-användaren.
const ADMIN_USERNAME_TO_RESET = 'admin';
const NEW_PASSWORD = 'password';

async function resetAdminPassword() {
    console.log(`Påbörjar nollställning av lösenord för admin-användaren: ${ADMIN_USERNAME_TO_RESET}...`);
    let client;

    try {
        const { db, client: connectedClient } = await connectToDatabase();
        client = connectedClient;

        // 1. Hitta admin-användaren
        const adminUser = await db.collection('users').findOne({ username: ADMIN_USERNAME_TO_RESET });
        if (!adminUser) {
            console.error(`Fel: Admin-användaren med användarnamn "${ADMIN_USERNAME_TO_RESET}" hittades inte.`);
            return;
        }
        const adminId = adminUser._id;
        console.log(`Hittade admin-användare med ID: ${adminId}`);

        // 2. Hasha det nya lösenordet
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);
        console.log('Lösenordet har hash:ats.');

        // 3. Uppdatera lösenordet i databasen
        const updateResult = await db.collection('users').updateOne(
            { _id: adminId },
            { $set: { password: hashedPassword } }
        );

        if (updateResult.modifiedCount === 1) {
            console.log('Admin-lösenordet har nollställts till "password"!');
        } else {
            console.log('Ingen ändring gjordes. Lösenordet kan redan vara "password" (hash:at).');
        }

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

resetAdminPassword();
