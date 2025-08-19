import { google, drive_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Readable } from 'stream'; // Add this import

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
            q: `'${FOLDER_ID}' in parents and mimeType contains 'image/' and trashed=false`,
            includeItemsFromAllDrives: true,
            supportsAllDrives: true,
            pageSize: 100, // Adjust as needed
            fields: "files(id, name, thumbnailLink, webViewLink, webContentLink)",
        });

        if (!res.data.files || res.data.files.length === 0) {
            console.log("No image files found.");
            return [];
        }
        return res.data.files;
    } catch (error) {
        console.error("Error listing files from Google Drive:", error);
        throw new Error('Failed to list image files from Google Drive.');
    }
}

export async function uploadImage(fileName: string, mimeType: string, fileContent: Buffer) {
    const driveClient = await getAuthenticatedClient();
    try {
        // Convert Buffer to Readable stream
        const stream = new Readable();
        stream.push(fileContent);
        stream.push(null); // Signal the end of the stream

        const response = await driveClient.files.create({
            requestBody: {
                name: fileName,
                mimeType: mimeType,
                parents: [FOLDER_ID!]
            },
            media: {
                mimeType: mimeType,
                body: stream // Use stream instead of Buffer
            },
            supportsAllDrives: true,
            fields: 'id'
        });
        return response.data;
    } catch (error) {
        console.error("Error uploading file to Google Drive:", error);
        throw new Error('Failed to upload image to Google Drive.');
    }
}

export async function deleteImage(fileId: string) {
    const driveClient = await getAuthenticatedClient();
    try {
        if (!fileId || typeof fileId !== 'string') {
            throw new Error('Invalid fileId provided.');
        }
        await driveClient.files.update({
            fileId: fileId,
            requestBody: { trashed: true },
            supportsAllDrives: true
        });
        return { message: 'Image moved to Trash successfully.' };
    } catch (error: any) {
        console.error("Error trashing file from Google Drive:", JSON.stringify(error, null, 2));
        if (error.code === 404) {
            return { message: 'Image not found, considered deleted.' };
        }
        throw new Error(`Failed to trash image from Google Drive: ${error.message}`);
    }
}