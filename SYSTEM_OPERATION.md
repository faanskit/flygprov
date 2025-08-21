# System Operation Guide

This document provides instructions for operating and managing the Flygprov application.

## Administrator Tasks

### Resetting the Admin Password

If you lose or forget the administrator password, you can reset it using a command-line script.

1.  Open your terminal in the root directory of the project.
2.  Run the following command:

    ```bash
    npm run db:reset:admin -w netlify/functions
    ```

3.  This script will reset the admin password to the default (`password`).

    **Important:** Log in immediately and change the password to something secure.

## Examiner Tasks

Examiners are responsible for managing students, creating tests, and assigning tests to students.

### Student Management

*   **Creating Students:** Navigate to the "Student Management" page to add new students to the system.
*   **Archiving Students:** Students who are no longer active can be archived. This removes them from the active student list but preserves their data.

### Test Management

*   **Creating Tests:** Go to the "Create Test" page to build new tests. You can select questions from the question bank and configure test settings.
*   **Assigning Tests:** Once a test is created, you can assign it to one or more students from the "Examiner Dashboard".

## Student Experience

Students can log in to take assigned tests and view their results.

### Taking a Test

1.  Log in to the student dashboard.
2.  Assigned tests will be listed.
3.  Click on a test to begin.
4.  Answer the questions and submit the test when finished.

### Viewing Results

*   After completing a test, the results will be available on the student's dashboard.
*   Students can review their answers and see their scores.
