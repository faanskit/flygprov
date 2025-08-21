import connectToDatabase from './database';
import bcrypt from 'bcryptjs';

// Användarnamn och lösenord för den initiala admin-användaren.
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'password';

// Data för de nio ämnena som ska skapas.
const subjectsData = [
    { code: 'LAW', name: 'Luftfartsrätt och bestämmelser', description: 'Prov för  nationella och internationella luftfartsregler.', defaultTimeLimitMinutes: 45 },
    { code: 'AGK', name: 'Allmän flygplanslära', description: 'Prov för  tekniska aspekter av luftfartyg och deras system.', defaultTimeLimitMinutes: 35 },
    { code: 'FPP', name: 'Prestanda och färdplanering', description: 'Prov för  planering och genomförande av flygningar inklusive ruttplanering och bränsleberäkningar.', defaultTimeLimitMinutes: 95 },
    { code: 'HPL', name: 'Människans prestationsförmåga', description: 'Prov för  fysiologiska och psykologiska faktorer som påverkar pilotens prestation.', defaultTimeLimitMinutes: 30 },
    { code: 'MET', name: 'Meteorologi', description: 'Prov för  väderfenomen och deras påverkan på flygning.', defaultTimeLimitMinutes: 45 },
    { code: 'NAV', name: 'Navigation', description: 'Prov för  principer och tekniker för flygnavigering.', defaultTimeLimitMinutes: 65 },
    { code: 'OP',  name: 'Operativa procedurer', description: 'Prov för  rutiner och procedurer för säker flygning.', defaultTimeLimitMinutes: 30 },
    { code: 'POF', name: 'Flygningens grundprinciper', description: 'Prov för  aerodynamik och flygplans prestanda.', defaultTimeLimitMinutes: 45 },
    { code: 'COM', name: 'Kommunikation', description: 'Prov för  radiokommunikation och flygledningsprocedurer.', defaultTimeLimitMinutes: 30 },
];

async function initializeSystem() {
    console.log('Påbörjar initialisering av systemet från grunden...');
    let client;

    try {
        const { db, client: connectedClient } = await connectToDatabase();
        client = connectedClient;

        // Kontrollera om systemet redan är initialiserat genom att söka efter admin-användaren.
        const usersCollection = db.collection('users');
        const adminUser = await usersCollection.findOne({ username: ADMIN_USERNAME });
        if (adminUser) {
            console.log('Systemet verkar redan vara initialiserat. Avbryter operation.');
            console.log('Om du vill nollställa admin-lösenordet, använd "reset-admin.ts" istället.');
            return;
        }

        // Skapa samlingarna om de inte finns (MongoDB skapar dem vid första insättningen).
        console.log('Skapar samlingar (questions, subjects, test_attempts, tests, users)...');
        await db.createCollection('questions');
        await db.createCollection('subjects');
        await db.createCollection('test_attempts');
        await db.createCollection('tests');
        await db.createCollection('users');

        // Populerar 'subjects' med ämnesdata.
        const subjectsCollection = db.collection('subjects');
        await subjectsCollection.insertMany(subjectsData);
        console.log(`Infogade ${subjectsData.length} ämnen i 'subjects' samlingen.`);

        // Skapar admin-användaren.
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

        const adminDoc = {
            username: ADMIN_USERNAME,
            password: hashedPassword,
            role: 'admin',
            createdAt: new Date()
        };
        await usersCollection.insertOne(adminDoc);
        console.log(`Skapade admin-användare med användarnamn: ${ADMIN_USERNAME} och lösenord: ${ADMIN_PASSWORD}`);
        
        console.log('Initialisering av systemet slutförd!');
        
    } catch (error) {
        console.error('Ett fel inträffade under initialiseringen:', error);
    } finally {
        // Stäng anslutningen för att säkerställa att skriptet avslutas korrekt.
        if (client) {
            await client.close();
        }
        process.exit(0);
    }
}
initializeSystem();
