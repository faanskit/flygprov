# Roadmap
## Overview
### Functionality
* TBA

### Improvements
* TBA

### Documentation
* Document system management
* Updated the README.md
* Create a owner and user manuals


## Detailed Description

### **Document system management**

**Problem:** The systemand its operation is not documented.

#### **3.1 Create documentation on system setup**
* Create SYSTEM_SETUP.md that documents the process on how to:
  - Set-up a MongoDb account and obtain the MONGO_URI
  - Set-up a Netlify account
  - Set-up a Github account
  - Clone the flyprov repository from https://github.com/faanskit/flygprov
  - Create Netllify project and connect it to Github
  - Create Refresh token using this script:
      // google.js
      const { google } = require("googleapis");
      const readline = require("readline");

      // Ersätt med dina egna värden från Google Cloud Console
      const CLIENT_ID = "YOUR_ID.apps.googleusercontent.com";
      const CLIENT_SECRET = "YOUR_SECRET";
      const REDIRECT_URI = "http://localhost:8888/api/oauth2callback"; 

      const oauth2Client = new google.auth.OAuth2(
        CLIENT_ID,
        CLIENT_SECRET,
        REDIRECT_URI
      );

      // Tillåt bara filåtkomst/skapande i Drive
      const SCOPES = [
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/drive.readonly"
      ];

      // Full drive access
      // const SCOPES = [
      //   "https://www.googleapis.com/auth/drive",
      // ];


      // Steg 1: Skapa en auth-URL
      const url = oauth2Client.generateAuthUrl({
        access_type: "offline", // Viktigt för att få refresh_token
        prompt: "consent",       // Tvinga fram en refresh_token första gången
        scope: SCOPES,
      });

      console.log("Öppna denna URL i din webbläsare:\n", url);

      // Steg 2: Klistra in koden du får från Google
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl.question("Klistra in koden här: ", async (code) => {
        try {
          const { tokens } = await oauth2Client.getToken(code);
          console.log("\n✅ Refresh token (spara denna i Netlify env):\n", tokens.refresh_token);
        } catch (err) {
          console.error("Fel vid hämtning av tokens:", err);
        }
        rl.close();
      });



  - Configure the environment variables in Netlify:
    .--------------------------------------------------------------------------------------.
    |                                Environment variables                                 |
    |--------------------------------------------------------------------------------------|
    |           Key           |                       Value                        | Scope |
    |-------------------------|----------------------------------------------------|-------|
    | GOOGLE_CLIENT_ID        | ************************************************** | All   |
    | GOOGLE_CLIENT_SECRET    | ************************************************** | All   |
    | GOOGLE_REFRESH_TOKEN    | ************************************************** | All   |
    | GOOGLE_SHARED_DRIVE_ID  | ************************************************** | All   |
    | GOOGLE_SHARED_FOLDER_ID | ************************************************** | All   |
    | GRACE_PERIOD_DAYS       | ************************************************** | All   |
    | JWT_SECRET              | ************************************************** | All   |
    | MONGO_DB_NAME           | ************************************************** | All   |
    | MONGO_URI               | ************************************************** | All   |
    '--------------------------------------------------------------------------------------'

  - Create a .env file from .env.example
  - Install Netlify CLI
  - Run the setup comment: npm run db:initiatize:system -w netlify/functions
  - Inform admin and default password
  - Login as admin to create examiners


#### **3.2 Create documentation on system setup**
* Create SYSTEM_OPERATION.md that documents the how to operate the system
    Reset the admin password:
    npm run db:reset:admin -w netlify/functions


### **Updated the README.md**

**Problem:** README.md is dated

#### **4.1 Update README.md**
* Based on the available sourcecode, updated the readme


### **Create a owner and user manuals**

**Problem:** There exist no user manual

#### **5.1 Create a OWNERS_MANUAL.md  that covers examiner and admin role**
* Based on the available sourcecode, create a onwers manual

#### **5.2 Create a USER_MANUAL.md  that covers student role**
* Based on the available sourcecode, create a user manual
