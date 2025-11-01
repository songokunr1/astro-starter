# REST API Plan

This document outlines the REST API for the Fiszki AI application, designed to support the features defined in the Product Requirements Document (PRD) and based on the specified database schema.

## 1. Resources

The API is built around the following core resources:

-   **Profiles**: Represents user-specific public data, linked to `auth.users`. Mapped to the `profiles` table.
-   **Flashcard Sets**: Collections of flashcards created by a user. Mapped to the `flashcard_sets` table.
-   **Flashcards**: Individual flashcards with front and back content. Mapped to the `flashcards` table.
-   **AI**: A virtual resource for handling AI-powered operations like flashcard generation.
-   **Learning**: A virtual resource for managing learning sessions and progress.

## 2. Endpoints

### 2.1. Profiles

#### GET /api/v1/profiles/me

-   **Description**: Retrieve the profile of the currently authenticated user.
-   **Request Body**: None.
-   **Response Body**:
    ```json
    {
      "id": "uuid",
      "username": "string",
      "avatar_url": "string | null",
      "notification_enabled": "boolean",
      "updated_at": "string<date-time>"
    }
    ```
-   **Success Codes**: `200 OK`
-   **Error Codes**: `401 Unauthorized`, `404 Not Found`

#### PATCH /api/v1/profiles/me

-   **Description**: Update the profile of the currently authenticated user.
-   **Request Body**:
    ```json
    {
      "username": "string (optional, min: 3)",
      "avatar_url": "string (optional)",
      "notification_enabled": "boolean (optional)"
    }
    ```
-   **Response Body**: The updated profile object.
-   **Success Codes**: `200 OK`
-   **Error Codes**: `400 Bad Request`, `401 Unauthorized`, `409 Conflict` (if username is taken)

### 2.2. Flashcard Sets

#### GET /api/v1/sets

-   **Description**: Get a paginated list of flashcard sets for the current user.
-   **Query Parameters**:
    -   `page: integer` (default: 1)
    -   `pageSize: integer` (default: 10)
    -   `sortBy: string` (e.g., 'name', 'created_at', default: 'updated_at')
    -   `sortOrder: string` ('asc' or 'desc', default: 'desc')
-   **Response Body**:
    ```json
    {
      "data": [
        {
          "id": "uuid",
          "name": "string",
          "description": "string | null",
          "created_at": "string<date-time>",
          "updated_at": "string<date-time>"
        }
      ],
      "pagination": {
        "page": 1,
        "pageSize": 10,
        "total": 100
      }
    }
    ```
-   **Success Codes**: `200 OK`
-   **Error Codes**: `401 Unauthorized`

#### POST /api/v1/sets

-   **Description**: Create a new flashcard set. This endpoint is for manual creation; AI generation uses a different endpoint.
-   **Request Body**:
    ```json
    {
      "name": "string (required, non-empty)",
      "description": "string (optional)"
    }
    ```
-   **Response Body**: The newly created flashcard set object.
-   **Success Codes**: `201 Created`
-   **Error Codes**: `400 Bad Request`, `401 Unauthorized`

#### GET /api/v1/sets/{setId}

-   **Description**: Get a single flashcard set by its ID, including all its flashcards.
-   **Response Body**:
    ```json
    {
      "id": "uuid",
      "name": "string",
      "description": "string | null",
      "created_at": "string<date-time>",
      "updated_at": "string<date-time>",
      "flashcards": [
        {
          "id": "uuid",
          "front": "string",
          "back": "string",
          "media_url": "string | null",
          "created_at": "string<date-time>",
          "updated_at": "string<date-time>"
        }
      ]
    }
    ```
-   **Success Codes**: `200 OK`
-   **Error Codes**: `401 Unauthorized`, `404 Not Found`

#### PATCH /api/v1/sets/{setId}

-   **Description**: Update the details of a flashcard set.
-   **Request Body**:
    ```json
    {
      "name": "string (optional, non-empty)",
      "description": "string (optional)"
    }
    ```
-   **Response Body**: The updated flashcard set object.
-   **Success Codes**: `200 OK`
-   **Error Codes**: `400 Bad Request`, `401 Unauthorized`, `404 Not Found`

#### DELETE /api/v1/sets/{setId}

-   **Description**: Delete a flashcard set and all its associated flashcards (soft delete).
-   **Response Body**: None.
-   **Success Codes**: `204 No Content`
-   **Error Codes**: `401 Unauthorized`, `404 Not Found`

### 2.3. Flashcards

#### POST /api/v1/sets/{setId}/flashcards

-   **Description**: Manually create a new flashcard within a specific set.
-   **Request Body**:
    ```json
    {
      "front": "string (required, max: 200 chars)",
      "back": "string (required, max: 200 chars)",
      "media_url": "string (optional)"
    }
    ```
-   **Response Body**: The newly created flashcard object.
-   **Success Codes**: `201 Created`
-   **Error Codes**: `400 Bad Request`, `401 Unauthorized`, `404 Not Found` (for the set)

#### PATCH /api/v1/flashcards/{flashcardId}

-   **Description**: Update an existing flashcard.
-   **Request Body**:
    ```json
    {
      "front": "string (optional, max: 200 chars)",
      "back": "string (optional, max: 200 chars)",
      "media_url": "string (optional)"
    }
    ```
-   **Response Body**: The updated flashcard object.
-   **Success Codes**: `200 OK`
-   **Error Codes**: `400 Bad Request`, `401 Unauthorized`, `404 Not Found`

#### DELETE /api/v1/flashcards/{flashcardId}

-   **Description**: Delete a flashcard (soft delete).
-   **Response Body**: None.
-   **Success Codes**: `204 No Content`
-   **Error Codes**: `401 Unauthorized`, `404 Not Found`

### 2.4. AI Operations

#### POST /api/v1/ai/generate-flashcards

-   **Description**: Generates a new, temporary set of flashcards from user-provided text without saving them. The response is a preview for the user to accept or reject.
-   **Request Body**:
    ```json
    {
      "source_text": "string (required)",
      "setName": "string (required)"
    }
    ```
-   **Response Body**:
    ```json
    {
      "temp_id": "string", // A temporary identifier for this generated set
      "setName": "string",
      "source_text": "string",
      "flashcards": [
        {
          "front": "string",
          "back": "string"
        }
      ]
    }
    ```
-   **Success Codes**: `200 OK`
-   **Error Codes**: `400 Bad Request`, `401 Unauthorized`, `500 Internal Server Error` (if AI service fails)

#### POST /api/v1/ai/accept-flashcards

-   **Description**: Accepts a previously generated set of flashcards, creating a permanent `flashcard_set` and its associated `flashcards`.
-   **Request Body**:
    ```json
    {
      "temp_id": "string (required)", // The temporary ID from the generation step
      "setName": "string (required)",
      "source_text": "string (required)",
      "flashcards": [
        { "front": "string", "back": "string" }
      ]
    }
    ```
-   **Response Body**: The newly created `flashcard_set` object with its ID.
    ```json
    {
      "id": "uuid",
      "name": "string",
      "description": null,
      "user_id": "uuid",
      // ... other set properties
    }
    ```
-   **Success Codes**: `201 Created`
-   **Error Codes**: `400 Bad Request`, `401 Unauthorized`

### 2.5. Learning and Ratings

#### GET /api/v1/learning/session

-   **Description**: Get a list of flashcards due for a review session.
-   **Query Parameters**:
    -   `setId: uuid (optional)`: Filter reviews for a specific set.
    -   `limit: integer` (default: 20): Max number of cards to return.
-   **Response Body**:
    ```json
    {
      "data": [
        {
          "id": "uuid",
          "flashcard_id": "uuid",
          "front": "string",
          "back": "string",
          "next_review_date": "string<date-time>"
        }
      ]
    }
    ```
-   **Success Codes**: `200 OK`
-   **Error Codes**: `401 Unauthorized`

#### POST /api/v1/learning/review

-   **Description**: Submit the result of a single flashcard review. The backend will update the `learning_schedules` table using the SM-2 algorithm logic.
-   **Request Body**:
    ```json
    {
      "flashcard_id": "uuid (required)",
      "quality": "integer (required, 0-5)" // SM-2 response quality
    }
    ```
-   **Response Body**: The updated learning schedule for the card.
    ```json
    {
      "flashcard_id": "uuid",
      "next_review_date": "string<date-time>",
      "interval": "integer",
      "repetitions": "integer",
      "ease_factor": "number"
    }
    ```
-   **Success Codes**: `200 OK`
-   **Error Codes**: `400 Bad Request`, `401 Unauthorized`, `404 Not Found`

#### POST /api/v1/flashcards/{flashcardId}/rate

-   **Description**: Give a thumbs-up or thumbs-down rating for an AI-generated flashcard.
-   **Request Body**:
    ```json
    {
      "rating": "integer (required, 1 for up, -1 for down)"
    }
    ```
-   **Response Body**: A confirmation message.
    ```json
    { "message": "Rating submitted successfully." }
    ```
-   **Success Codes**: `201 Created`
-   **Error Codes**: `400 Bad Request`, `401 Unauthorized`, `404 Not Found`, `409 Conflict` (if already rated)

## 3. Authentication and Authorization

-   **Authentication**: The API will use JWT-based authentication provided by Supabase. Clients must include the `Authorization: Bearer <SUPABASE_JWT>` header in all requests to protected endpoints.
-   **Authorization**: Row-Level Security (RLS) policies are enforced at the database level, as defined in `db-plan.md`. The API endpoints, running in the context of the authenticated user, will only be able to access data owned by that user (`auth.uid() = user_id`). Attempting to access another user's data will result in a `404 Not Found` error.

## 4. Validation and Business Logic

-   **Validation**:
    -   `profiles`: `username` length must be >= 3.
    -   `flashcard_sets`: `name` must not be empty.
    -   `flashcards`: `front` and `back` are required and limited to 200 characters at the application level.
    -   `flashcard_ratings`: `rating` must be `1` or `-1`.
    -   `learning_sessions`: `response_quality` must be between `0` and `5`.
    -   Payloads will be validated using a library like `zod` in the Astro backend before processing.
-   **Business Logic**:
    -   **AI Generation**: Handled by the `/ai/generate-flashcards` endpoint, which calls an external service (e.g., OpenRouter.ai) and returns a temporary result. The `/ai/accept-flashcards` endpoint persists this data.
    -   **Spaced Repetition**: The SM-2 algorithm logic is encapsulated in the backend. The `/learning/review` endpoint takes the user's recall quality and calculates the next `interval`, `ease_factor`, and `next_review_date`.
    -   **Soft Deletes**: `DELETE` endpoints will set the `deleted_at` timestamp rather than permanently removing data. `GET` endpoints will automatically filter out records where `deleted_at` is not null.
    -   **Statistics**: `user_stats` will be updated via PostgreSQL triggers in the database to avoid performance overhead in the API.
-   **Rate Limiting**: API endpoints should be rate-limited to prevent abuse, especially for costly operations like AI generation. A limit of 60 requests per minute per user is a reasonable starting point.
