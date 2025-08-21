# System Setup Guide

This guide provides step-by-step instructions for setting up the Flygprov application.

## Prerequisites

Before you begin, ensure you have the following:

*   A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account.
*   A [Netlify](https://www.netlify.com/) account.
*   A [GitHub](https://github.com/) account.
*   [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/) installed on your local machine.

## Setup Steps

### 1. Set up MongoDB Atlas

1.  Create a new project and a new cluster in MongoDB Atlas.
2.  In your cluster, go to **Security > Database Access** and create a new database user with read and write access.
3.  Go to **Security > Network Access** and add your IP address to the IP access list.
4.  Go to your cluster's **Overview** page and click **Connect**. Choose "Connect your application" and copy the connection string (URI).
5. Copy your MONGO_URI (Connection String).

### 2. Set up GitHub Repository

1.  Fork the Flygprov repository from [https://github.com/faanskit/flygprov](https://github.com/faanskit/flygprov) to your own GitHub account.
2.  Clone your forked repository to your local machine:
    ```bash
    git clone https://github.com/YOUR_USERNAME/flygprov.git
    cd flygprov
    ```

### 3. Set up Netlify Project

1.  Log in to your Netlify account.
2.  Click **Add new site > Import an existing project**.
3.  Connect to GitHub and authorize Netlify to access your repositories.
4.  Select your forked `flygprov` repository.
5.  Configure the build settings:
    *   **Base directory:** `(leave blank)`
    *   **Build command:** `npm run build`
    *   **Publish directory:** `frontend/dist`
6.  Click **Deploy site**

### 4. Configure Google API for Image Handling

The application uses the Google Drive API to manage images for questions.

#### 4.1. Create Google Cloud Project

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a new project.
3.  Enable the **Google Drive API** for this project.

#### 4.2. Create OAuth 2.0 Credentials

1.  Go to **APIs & Services > Credentials**.
2.  Click **Create Credentials > OAuth client ID**.
3.  Select **Web application** as the application type.
4.  Add `http://localhost:8888/api/oauth2callback` to the **Authorized redirect URIs**.
5.  Click **Create**.
6.  Copy the **Client ID** and **Client Secret**. These will be your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` environment variables.

#### 4.3. Generate a Refresh Token

To allow the application to access Google Drive on your behalf, you need to generate a refresh token.

1.  Create a file named `google.js` with the following content:

    ```javascript
    // google.js
    const { google } = require("googleapis");
    const readline = require("readline");

    // Replace with your own values from the Google Cloud Console
    const CLIENT_ID = "YOUR_ID.apps.googleusercontent.com";
    const CLIENT_SECRET = "YOUR_SECRET";
    const REDIRECT_URI = "http://localhost:8888/api/oauth2callback"; 

    const oauth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URI
    );

    // Scope for file access in Drive
    const SCOPES = [
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive.readonly"
    ];

    // Step 1: Create an auth URL
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline", // Important for getting a refresh_token
      prompt: "consent",       // Force a refresh_token the first time
      scope: SCOPES,
    });

    console.log("Open this URL in your browser:\n", url);

    // Step 2: Paste the code you get from Google
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question("Paste the code here: ", async (code) => {
      try {
        const { tokens } = await oauth2Client.getToken(code);
        console.log("\n✅ Refresh token (save this in Netlify env):\n", tokens.refresh_token);
      } catch (err) {
        console.error("Error fetching tokens:", err);
      }
      rl.close();
    });
    ```

2.  Replace `YOUR_ID.apps.googleusercontent.com` and `YOUR_SECRET` with your actual Client ID and Client Secret.
3.  Run the script from your terminal:
    ```bash
    node google.js
    ```
4.  Open the URL provided in your browser.
5.  Log in with your Google account and grant the requested permissions.
6.  You will be redirected to a page that might show an error (this is expected as the localhost server is not running). Copy the `code` parameter from the URL in the address bar.
7.  Paste the code back into your terminal.
8.  The script will output a **refresh token**. This is your `GOOGLE_REFRESH_TOKEN`.

### 5. Configure Environment Variables in Netlify

Go to your site's settings in Netlify and navigate to **Site configuration > Environment variables**. Add the following variables:

| Key                     | Value                                     | Scope |
| ----------------------- | ----------------------------------------- | ----- |
| `MONGO_URI`             | Your MongoDB connection string.           | All   |
| `MONGO_DB_NAME`         | The name of your database (e.g., `flygprov`). | All   |
| `JWT_SECRET`            | A long, random, secret string.            | All   |
| `GOOGLE_CLIENT_ID`      | Your Google OAuth Client ID.              | All   |
| `GOOGLE_CLIENT_SECRET`  | Your Google OAuth Client Secret.          | All   |
| `GOOGLE_REFRESH_TOKEN`  | The refresh token you generated.          | All   |
| `GOOGLE_SHARED_DRIVE_ID`| ID of the Shared Drive to use.            | All   |
| `GOOGLE_SHARED_FOLDER_ID`| ID of the folder within the Shared Drive. | All   |
| `GRACE_PERIOD_DAYS`     | Number of days for student grace period.  | All   |

### 6. Local Development Setup

1.  Create a `.env` file in the root of the project by copying the `.env.example` file:
    ```bash
    cp .env.example .env
    ```
2.  Fill in the `.env` file with the same values you used in Netlify.

### 7. Install Netlify CLI and Initialize the System

1.  Install the Netlify CLI globally:
    ```bash
    npm install -g netlify-cli
    ```
2.  Log in to your Netlify account:
    ```bash
    netlify login
    ```
3.  Link your local project to the Netlify site:
    ```bash
    netlify link
    ```
4.  Run the system initialization script. This will set up the necessary database collections and create the initial admin user.
    ```bash
    npm run db:initialize:system -w netlify/functions
    ```

### 8. First Time Login

The initialization script creates a default administrator account:

*   **Username:** `admin`
*   **Password:** `password`

Log in with these credentials to access the admin dashboard and start creating examiners and managing the system. It is highly recommended to change the default admin password after your first login.
