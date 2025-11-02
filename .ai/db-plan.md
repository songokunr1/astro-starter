# Database Schema Plan for Fiszki AI

This document outlines the PostgreSQL database schema for the Fiszki AI application, designed based on the product requirements, planning session notes, and the specified technology stack.

## 1. Tables

### `profiles`
Stores public user data, extending Supabase's `auth.users` table.

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| `id` | `uuid` | Primary Key, `references auth.users(id)` | User's unique identifier from the authentication table. |
| `username` | `text` | Unique, `check(length(username) >= 3)` | Public username for the user. |
| `avatar_url` | `text` | | URL to the user's avatar image. |
| `notification_enabled` | `boolean` | Not Null, `default true` | User's preference for receiving notifications. |
| `updated_at` | `timestamptz` | Not Null, `default now()` | Timestamp of the last update. |

---

### `flashcard_sets`
Groups of flashcards created by users.

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| `id` | `uuid` | Primary Key, `default gen_random_uuid()` | Unique identifier for the flashcard set. |
| `user_id` | `uuid` | Not Null, Foreign Key (`profiles.id`) | The user who owns this set. |
| `name` | `text` | Not Null, `check(length(name) > 0)` | Name of the flashcard set. |
| `description` | `text` | | Optional description for the set. |
| `source_text` | `text` | | The original text used by AI to generate the flashcards. |
| `created_at` | `timestamptz` | Not Null, `default now()` | Timestamp of creation. |
| `updated_at` | `timestamptz` | Not Null, `default now()` | Timestamp of the last update. |
| `deleted_at` | `timestamptz` | | For soft-deleting the set. |

---

### `flashcards`
Individual flashcards with a front and back.

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| `id` | `uuid` | Primary Key, `default gen_random_uuid()` | Unique identifier for the flashcard. |
| `flashcard_set_id` | `uuid` | Not Null, Foreign Key (`flashcard_sets.id`) | The set this flashcard belongs to. |
| `front` | `text` | Not Null | The front side of the flashcard (question). |
| `back` | `text` | Not Null | The back side of the flashcard (answer). |
| `media_url` | `text` | | Optional URL for associated media (image, audio). |
| `external_id` | `uuid` | | Optional external ID for imports (e.g., from Anki). |
| `created_at` | `timestamptz` | Not Null, `default now()` | Timestamp of creation. |
| `updated_at` | `timestamptz` | Not Null, `default now()` | Timestamp of the last update. |
| `deleted_at` | `timestamptz` | | For soft-deleting the flashcard. |

---

### `learning_schedules` (SM-2 Algorithm)
Stores the spaced repetition schedule for each user and flashcard.

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| `id` | `uuid` | Primary Key, `default gen_random_uuid()` | Unique identifier for the schedule entry. |
| `user_id` | `uuid` | Not Null, Foreign Key (`profiles.id`) | The user learning the flashcard. |
| `flashcard_id` | `uuid` | Not Null, Foreign Key (`flashcards.id`) | The flashcard being learned. |
| `next_review_date` | `timestamptz` | Not Null | When the flashcard should be reviewed next. |
| `interval` | `integer` | Not Null, `default 1` | The repetition interval in days. |
| `repetitions` | `integer` | Not Null, `default 0` | The number of times the card has been successfully recalled. |
| `ease_factor` | `real` | Not Null, `default 2.5` | The factor determining how the interval grows. |
| `created_at` | `timestamptz` | Not Null, `default now()` | Timestamp of creation. |
| `updated_at` | `timestamptz` | Not Null, `default now()` | Timestamp of the last update. |
| | | `unique(user_id, flashcard_id)` | A user has only one schedule per flashcard. |

---

### `flashcard_ratings`
Stores user feedback on AI-generated flashcards.

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| `id` | `uuid` | Primary Key, `default gen_random_uuid()` | Unique identifier for the rating. |
| `user_id` | `uuid` | Not Null, Foreign Key (`profiles.id`) | The user who rated the flashcard. |
| `flashcard_id` | `uuid` | Not Null, Foreign Key (`flashcards.id`) | The flashcard that was rated. |
| `rating` | `smallint` | Not Null, `check(rating in (1, -1))` | The rating given: 1 for thumbs up, -1 for thumbs down. |
| `created_at` | `timestamptz` | Not Null, `default now()` | Timestamp of when the rating was given. |
| | | `unique(user_id, flashcard_id)` | A user can rate a flashcard only once. |

---

### `learning_sessions`
Records the history of learning sessions for analysis.

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| `id` | `uuid` | Primary Key, `default gen_random_uuid()` | Unique identifier for the session entry. |
| `user_id` | `uuid` | Not Null, Foreign Key (`profiles.id`) | The user who had the session. |
| `flashcard_id` | `uuid` | Not Null, Foreign Key (`flashcards.id`) | The flashcard reviewed in the session. |
| `response_quality` | `smallint` | Not Null, `check(response_quality between 0 and 5)` | User's self-assessed quality of response (e.g., SM-2 scale). |
| `session_date` | `timestamptz` | Not Null, `default now()` | Timestamp of the learning event. |

---

### `user_stats`
Cached statistics for each user to avoid expensive real-time calculations.

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| `user_id` | `uuid` | Primary Key, Foreign Key (`profiles.id`) | The user these stats belong to. |
| `flashcards_created` | `integer` | Not Null, `default 0` | Total number of flashcards created. |
| `sessions_completed` | `integer` | Not Null, `default 0` | Total number of learning sessions completed. |
| `last_seen_at` | `timestamptz` | | Last time the user was active. |
| `updated_at` | `timestamptz` | Not Null, `default now()` | Timestamp of the last update. |

---

### `system_logs`
For debugging and monitoring system events, especially AI generation.

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| `id` | `uuid` | Primary Key, `default gen_random_uuid()` | Unique identifier for the log entry. |
| `user_id` | `uuid` | Foreign Key (`profiles.id`) | The user associated with the event (if any). |
| `event_type` | `text` | Not Null | The type of event being logged (e.g., 'AI_GENERATION_ERROR'). |
| `message` | `text` | | Detailed log message. |
| `metadata` | `jsonb` | | Additional structured data about the event. |
| `created_at` | `timestamptz` | Not Null, `default now()` | Timestamp of the event. |

## 2. Relationships

-   **`profiles` to `flashcard_sets`**: One-to-Many (`user_id`). A user can have many flashcard sets.
-   **`flashcard_sets` to `flashcards`**: One-to-Many (`flashcard_set_id`). A set contains many flashcards.
-   **`profiles` and `flashcards` to `learning_schedules`**: Many-to-Many through the `learning_schedules` table. A user has a learning schedule for many flashcards.
-   **`profiles` and `flashcards` to `flashcard_ratings`**: Many-to-Many through the `flashcard_ratings` table. Many users can rate many flashcards.
-   **`profiles` and `flashcards` to `learning_sessions`**: Many-to-Many through the `learning_sessions` table, recording each review interaction.
-   **`profiles` to `user_stats`**: One-to-One (`user_id`). Each user has one corresponding stats entry.
-   **`profiles` to `system_logs`**: One-to-Many (`user_id`). A user can be associated with multiple system log entries.

## 3. Indexes

-   **Primary Keys**: All primary keys (`id`, `user_id` in `user_stats`) are automatically indexed.
-   **Foreign Keys**: Indexes should be created on all foreign key columns to optimize join performance:
    -   `flashcard_sets(user_id)`
    -   `flashcards(flashcard_set_id)`
    -   `learning_schedules(user_id)`
    -   `learning_schedules(flashcard_id)`
    -   `flashcard_ratings(user_id)`
    -   `flashcard_ratings(flashcard_id)`
    -   `learning_sessions(user_id)`
    -   `learning_sessions(flashcard_id)`
    -   `system_logs(user_id)`
-   **Query Performance**:
    -   `learning_schedules(next_review_date)`: Crucial for efficiently fetching flashcards due for review.
    -   `flashcards(deleted_at)` and `flashcard_sets(deleted_at)`: To efficiently filter out soft-deleted records.
-   **Unique Constraints**: Unique constraints on `(user_id, flashcard_id)` in `learning_schedules` and `flashcard_ratings` are automatically indexed.

## 4. PostgreSQL Policies (Row-Level Security)

RLS will be enabled on all tables containing user-specific data to ensure users can only access their own information. The `auth.uid()` function from Supabase will be used to identify the current user.

-   **Enable RLS on tables**:
    `flashcard_sets`, `flashcards`, `learning_schedules`, `flashcard_ratings`, `learning_sessions`, `user_stats`, `profiles`.

-   **`profiles` Table Policy**:
    -   **SELECT**: `create policy "Users can view their own profile." on profiles for select using (auth.uid() = id);`
    -   **UPDATE**: `create policy "Users can update their own profile." on profiles for update using (auth.uid() = id);`

-   **General Policy for other tables (example for `flashcard_sets`)**:
    -   **SELECT**: `create policy "Users can view their own flashcard sets." on public.flashcard_sets for select using (auth.uid() = user_id and deleted_at is null);`
    -   **INSERT**: `create policy "Users can create their own flashcard sets." on public.flashcard_sets for insert with check (auth.uid() = user_id);`
    -   **UPDATE**: `create policy "Users can update their own flashcard sets." on public.flashcard_sets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);`
    -   **DELETE**: `create policy "Users can delete their own flashcard sets." on public.flashcard_sets for delete using (auth.uid() = user_id);`
    -   This policy template will be applied to `flashcards` (via sets), `learning_schedules`, `flashcard_ratings`, `learning_sessions`, and `user_stats`.

## 5. Additional Notes

-   **Soft Deletes**: The `deleted_at` column is used for soft deletes. Queries on these tables must include a `WHERE deleted_at IS NULL` clause to exclude deleted records.
-   **User Management**: User authentication is handled by Supabase's `auth` schema. The `profiles` table is for public data and application-specific settings, linked via a trigger that runs after a new user signs up.
-   **Triggers for Stats**: The `user_stats` table should be updated using database triggers on the `flashcards` and `learning_sessions` tables to maintain accurate counts without performance overhead on application logic. For example, a trigger on `flashcards` after insert would increment `flashcards_created`.
-   **Enums**: While PostgreSQL supports `ENUM` types, using `smallint` or `text` with `CHECK` constraints (as shown) offers more flexibility for future changes without requiring schema migrations to alter the enum list.
-   **Character Limits**: The 200-character limit for flashcard content is a business rule to be enforced at the application level, not a database constraint. Using the `text` type provides flexibility.
