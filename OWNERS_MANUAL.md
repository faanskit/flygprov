# Owner's Manual (Admin & Examiner)

This manual provides a comprehensive guide for Administrators and Examiners on how to manage the Flygprov application.

## Table of Contents

1.  [Administrator Role](#1-administrator-role)
    *   [Dashboard Overview](#dashboard-overview)
    *   [Managing Examiners](#managing-examiners)
    *   [Managing Students](#managing-students)
    *   [Managing Subjects](#managing-subjects)
    *   [Question Bank Management](#question-bank-management)
    *   [Image Management](#image-management)
    *   [Importing Questions](#importing-questions)
    *   [Changing Your Password](#changing-your-password)
2.  [Examiner Role](#2-examiner-role)
    *   [Dashboard Overview](#dashboard-overview-1)
    *   [Managing Students](#managing-students-1)
    *   [Viewing Student Details](#viewing-student-details)
    *   [Creating and Assigning Tests](#creating-and-assigning-tests)
    *   [Changing Your Password](#changing-your-password-1)

---

## 1. Administrator Role

Administrators have the highest level of access and can manage all aspects of the system.

### Dashboard Overview

The admin dashboard is organized into several tabs:

*   **Examiners:** Create, view, archive, and manage examiner accounts.
*   **Students:** A complete overview of all students in the system, with the same management capabilities as for examiners.
*   **Subjects:** Manage the nine mandatory subject areas for the pilot theory exams.
*   **Questions:** A comprehensive question bank where you can create, edit, and manage all questions for all subjects.
*   **Images:** Upload and manage images that can be linked to questions.
*   **Import:** Bulk import questions from a CSV file.
*   **My Account:** Change your own administrator password.

### Managing Examiners

In the **Examiners** tab, you can:

*   **View Examiners:** See a list of all examiners with their status (Active/Archived), creation date, and password status.
*   **Create a New Examiner:**
    1.  Click the "Create New Examiner" button.
    2.  Enter a unique username.
    3.  A temporary password (`username123`) will be generated. The examiner will be forced to change this on their first login.
*   **Perform Actions:** For each examiner, you can:
    *   **Archive/Reactivate:** Temporarily disable or re-enable an examiner's account.
    *   **Reset Password:** Generate a new temporary password for an examiner who has lost theirs.
    *   **Delete Permanently:** Completely remove an examiner from the system. This action cannot be undone.

### Managing Students

The **Students** tab provides the same functionalities as the Examiners tab but for student accounts. You can create students with either local authentication (username/password) or Google authentication (via email).

### Managing Subjects

In the **Subjects** tab, you can:

*   **View Subjects:** See a list of all subjects, including their code, description, and default time limit for tests.
*   **Create a New Subject:**
    1.  Click "Create New Subject".
    2.  Fill in the name, a unique code (e.g., "010"), a description, and the default test time in minutes.
*   **Edit a Subject:** Click the "Edit" button to modify an existing subject's details.
*   **Delete a Subject:** Click "Delete". **Warning:** Deleting a subject will also permanently delete all questions associated with it.

### Question Bank Management

The **Questions** tab is a powerful tool for managing all test questions.

1.  **Select a Subject:** First, choose a subject from the dropdown menu to view its questions.
2.  **Filter and Search:** You can filter questions by their status (Active/Inactive) or search for specific text within a question.
3.  **Create a New Question:**
    *   Click "Create New Question".
    *   Write the question text.
    *   Enter the four multiple-choice options.
    *   Select the correct option.
    *   (Optional) Click "Select Image" to attach an image to the question.
4.  **Edit a Question:** Click the pencil icon next to a question to modify it.
5.  **Toggle Status:** Use the toggle button to activate or deactivate a question. Inactive questions will not be included when generating new tests.
6.  **Delete a Question:** Click the trash can icon to permanently delete a question.

### Image Management

The **Images** tab allows you to manage the image library for questions.

*   **Upload an Image:**
    1.  Click "Choose File" and select an image from your computer.
    2.  Click "Upload Image". The image will be uploaded to the system's Google Drive folder.
*   **View and Delete Images:** The gallery displays all available images. You can delete an image by clicking the "Delete" button. **Note:** You cannot delete an image that is currently being used by one or more questions.

### Importing Questions

The **Import** tab allows you to bulk-add questions from a CSV file.

1.  **Prepare your CSV:** The file must have the following columns: `code`, `question`, `option_1`, `option_2`, `option_3`, `option_4`, `correct_option`, and optionally `image`.
2.  **Select File:** Choose your prepared CSV file.
3.  **Analyze:** Click "Analyze CSV". The system will show a summary of new questions found and any duplicates.
4.  **Handle Images:** If your CSV includes an `image` column, the system will prompt you to link each image name to an existing image in the system or upload a new one.
5.  **Confirm Import:** Once all images are handled, click "Confirm Import" to add the new questions to the database.

### Changing Your Password

In the **My Account** tab, you can change your own password by providing your current password and a new one.

---

## 2. Examiner Role

Examiners are responsible for managing students and their tests.

### Dashboard Overview

The examiner dashboard provides a quick overview of all active students, showing their progress (number of passed subjects). From here, you can click "View Details" to manage an individual student.

### Managing Students

From the "Student Management" page in the header, you can:

*   **View Students:** See a list of all students you manage, their status, and creation date.
*   **Create a New Student:**
    1.  Click "Create New Student".
    2.  Enter a unique username.
    3.  A temporary password (`username123`) will be generated. The student will be forced to change this on their first login.
*   **Perform Actions:**
    *   **Archive/Reactivate:** Temporarily disable or re-enable a student's account.
    *   **Reset Password:** Generate a new temporary password for a student.
    *   **Delete Permanently:** Completely remove a student and all their data. This cannot be undone.

### Viewing Student Details

After clicking "View Details" for a student, you can see their progress in each subject. The status for each subject can be:

*   **Not Started:** The student has not yet attempted a test in this subject.
*   **In Progress:** The student has attempted a test but has not yet passed.
*   **Assigned:** You have created a test for this subject, but the student has not started it yet.
*   **Passed:** The student has successfully passed a test in this subject.

### Creating and Assigning Tests

From the student details page, you can create a new test for any subject the student has not yet passed.

1.  **Create Test:** Click the "Create Test" button next to a subject.
2.  **Review Questions:** The system will automatically generate a test with 20 random, active questions from the question bank for that subject. You can review the questions and click the "refresh" icon next to any question to swap it for a different one.
3.  **Set Time Limit:** Adjust the test's time limit if needed (it defaults to the subject's standard time).
4.  **Assign Test:** Click "Assign Test". The test is now assigned to the student and will appear on their dashboard when they log in.

### Changing Your Password

You can change your password via the "My Account" link in the header dropdown. If this is your first time logging in, you will be required to change your temporary password.
