# Flygprov

A web application for preparatory tests (pre-tests) for pilot students. The application helps students practice for their theoretical exams in the nine mandatory subject areas.

## Features

*   **Role-Based Access Control:** Separate views and permissions for Students, Examiners, and Administrators.
*   **Student Dashboard:** Personal overview showing the status of all nine subjects, with the ability to start available tests.
*   **Test Flow:** Complete test process with multiple-choice questions, progress indicators, and navigation.
*   **Results Page:** Detailed results page showing scores and a review of correct/incorrect answers.
*   **Examiner Dashboard:** Manage students, create and assign tests.
*   **Admin Dashboard:** Manage examiners, subjects, and system settings.
*   **Question Bank:** Central repository for managing all test questions.
*   **Image Management:** Questions can include images, which are managed via Google Drive.

## Tech Stack

*   **Frontend:** TypeScript, HTML, Bootstrap
*   **Backend:** Netlify Functions (TypeScript)
*   **Database:** MongoDB
*   **Image Storage:** Google Drive API
*   **Build Tool:** esbuild
*   **Package Manager:** npm Workspaces

## Getting Started

To run the project locally, follow these steps:

### 1. Prerequisites
*   [Node.js](https://nodejs.org/) (LTS version recommended)
*   A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account
*   A [Google Cloud Platform](https://console.cloud.google.com/) account
*   A [Netlify](https://www.netlify.com/) account

### 2. Installation
1.  Clone the repository:
    ```bash
    git clone https://github.com/faanskit/flygprov.git
    cd flygprov
    ```
2.  Install all dependencies in the monorepo:
    ```bash
    npm install
    ```

### 3. Configuration
1.  Follow the detailed instructions in [SYSTEM_SETUP.md](./SYSTEM_SETUP.md) to set up your environment variables for MongoDB, Google Drive, and Netlify.
2.  Create a `.env` file in the project root by copying from `.env.example` and fill in the required values.

### 4. Database Initialization
To populate the database with the initial data and system settings, run the following command from the project root:

```bash
# Initialize the system (creates admin user, subjects, etc.)
npm run db:initialize:system -w netlify/functions
```

### 5. Run the Development Server
Start the local server that handles both the frontend and backend functions:
```bash
netlify dev
```
The application is now available at `http://localhost:8888`.

### Usage
Log in with the default administrator account:
-   **Username:** `admin`
-   **Password:** `password`

From the admin dashboard, you can create examiners. Examiners can then create students.
