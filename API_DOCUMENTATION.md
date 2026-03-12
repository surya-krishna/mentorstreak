# API Documentation for Test Feature

## Overview
This document outlines the API endpoints required to support the new Test Creation feature in the Course Creator interface.

## Test Management APIs

### 1. Create/Update Test
**Endpoint:** `POST /creator/v2/tests`
**Description:** Creates a new test or updates an existing one.
**Request Body:**
```json
{
  "id": "string (optional for create)",
  "courseId": "string",
  "title": "string",
  "type": "CHAPTER | OVERALL",
  "duration": "number (minutes)",
  "instructions": "string",
  "sections": [
    {
      "name": "string",
      "questions": [
        {
          "type": "MCQ | MSQ | Descriptive | Fill-in-the-Blanks",
          "text": "string",
          "options": [
            { "text": "string", "isCorrect": boolean }
          ],
          "marksPos": "number",
          "marksNeg": "number"
        }
      ]
    }
  ],
  "status": "draft | published"
}
```
**Response:**
```json
{
  "success": true,
  "data": { "id": "test_123", ... }
}
```

### 2. List Tests for Course
**Endpoint:** `GET /creator/v2/courses/:courseId/tests`
**Description:** Retrieves all tests associated with a specific course.
**Response:**
```json
{
  "success": true,
  "data": [
    { "id": "test_123", "title": "Chapter 1 Quiz", ... }
  ]
}
```

### 3. Delete Test
**Endpoint:** `DELETE /creator/v2/tests/:testId`
**Description:** Deletes a specific test.
**Response:**
```json
{
  "success": true,
  "message": "Test deleted successfully"
}
```

### 4. Get Test Details
**Endpoint:** `GET /creator/v2/tests/:testId`
**Description:** Retrieves detailed information for a specific test.
**Response:**
```json
{
  "success": true,
  "data": { ...test object... }
}
```

## Integration Notes
- The frontend currently uses a mock implementation for `saveTest` and `deleteTest`.
- These endpoints need to be implemented on the backend to ensure data persistence.
- Error handling should return appropriate HTTP status codes (400 for validation errors, 404 for not found, 500 for server errors).
