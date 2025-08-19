import { google, drive_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:8888/api/oauth2callback";
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const SHARED_DRIVE_ID = process.env.GOOGLE_SHARED_DRIVE_ID;
const FOLDER_ID = process.env.GOOGLE_SHARED_FOLDER_ID;

let drive: drive_v3.Drive | undefined;

async function getAuthenticatedClient(): Promise<drive_v3.Drive> {
    if (drive) {
        return drive;
    }

    const oauth2Client = new google.auth.OAuth2(
        CLIENT_ID,
        CLIENT_SECRET,
        REDIRECT_URI
    );

    oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

    drive = google.drive({ version: 'v3', auth: oauth2Client });
    return drive;
}

export async function listImageFiles() {
    const driveClient = await getAuthenticatedClient();
    console.log("Listing image files from Google Drive...");
    try {
        console.log(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, REFRESH_TOKEN);
        console.log(SHARED_DRIVE_ID, FOLDER_ID);
        const res = await driveClient.files.list({
            corpora: "drive",
            driveId: SHARED_DRIVE_ID,
            q: `'${FOLDER_ID}' in parents and mimeType contains 'image/'`,
            includeItemsFromAllDrives: true,
            supportsAllDrives: true,
            pageSize: 100, // Adjust as needed
            fields: "files(id, name, thumbnailLink, webViewLink, webContentLink)",
        });

        console.log("Response from Google Drive:", res.data);
        if (!res.data.files || res.data.files.length === 0) {
            console.log("No image files found.");
            return [];
        }
        console.log(`Found ${res.data.files.length} image files.`);
        return res.data.files;
    } catch (error) {
        console.error("Error listing files from Google Drive:", error);
        throw new Error('Failed to list image files from Google Drive.');
    }
}
