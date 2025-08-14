# API Documentation

This document provides documentation for the API endpoints in the Flygprov application.

## Examiner Endpoints

All examiner endpoints require a valid JWT token with the `examinator` role in the `Authorization` header.

### Student Management

#### `GET /api/examinator/students`

Retrieves a list of all students.

**Query Parameters:**

*   `status` (optional): Filter students by status. Can be `active`, `archived`, or `all`. Defaults to `all`.

**Response:**

```json
[
    {
        "userId": "60d5f3f7a3b4c9001f0b8e8c",
        "username": "student1",
        "status": "active",
        "createdAt": "2021-06-25T12:00:00.000Z",
        "forcePasswordChange": false
    },
    {
        "userId": "60d5f3f7a3b4c9001f0b8e8d",
        "username": "student2",
        "status": "archived",
        "createdAt": "2021-06-24T12:00:00.000Z",
        "forcePasswordChange": true
    }
]
```

#### `POST /api/examinator/students`

Creates a new student.

**Request Body:**

```json
{
    "username": "newstudent"
}
```

**Response:**

```json
{
    "userId": "60d5f3f7a3b4c9001f0b8e8e",
    "username": "newstudent",
    "tempPassword": "newstudent123"
}
```

#### `PUT /api/examinator/students/:studentId/archive`

Archives a student.

**Parameters:**

*   `studentId`: The ID of the student to archive.

**Response:**

```json
{
    "message": "Student archived successfully"
}
```

#### `PUT /api/examinator/students/:studentId/reactivate`

Reactivates a student.

**Parameters:**

*   `studentId`: The ID of the student to reactivate.

**Response:**

```json
{
    "message": "Student reactivated successfully"
}
```

#### `DELETE /api/examinator/students/:studentId`

Deletes a student permanently.

**Parameters:**

*   `studentId`: The ID of the student to delete.

**Response:**

```json
{
    "message": "Student deleted permanently"
}
```

## Student Endpoints

All student endpoints require a valid JWT token with the `student` role in the `Authorization` header.

### `PUT /api/student/change-password`

Changes the password for the currently logged in student.

**Request Body:**

```json
{
    "oldPassword": "currentpassword",
    "newPassword": "newsecretpassword"
}
```

**Response:**

```json
{
    "message": "Password updated successfully"
}
```
