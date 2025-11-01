# API Endpoint Implementation Plan: GET /api/v1/learning/session

## 1. Przegląd punktu końcowego
Ten punkt końcowy pobiera listę fiszek, które są zaplanowane do powtórki dla aktualnie uwierzytelnionego użytkownika. Działa w oparciu o tabelę `learning_schedules` i zwraca fiszki, dla których `next_review_date` jest w przeszłości lub teraźniejszości.

## 2. Szczegóły żądania
- **Metoda HTTP**: `GET`
- **Struktura URL**: `/api/v1/learning/session`
- **Parametry**:
  - **Opcjonalne**:
    - `setId: uuid`: Filtruje powtórki tylko do konkretnego zestawu.
    - `limit: integer` (domyślnie 20): Maksymalna liczba kart do zwrócenia.
- **Request Body**: Brak.

## 3. Wykorzystywane typy
- **DTOs**:
  - `LearningSessionFlashcardDto`: Obiekt odpowiedzi zawierający dane fiszki i harmonogramu powtórek.
- **Walidacja**:
  - Schemat Zod do walidacji opcjonalnych parametrów zapytania.

## 4. Szczegóły odpowiedzi
- **Sukces (`200 OK`)**: Zwraca tablicę obiektów `LearningSessionFlashcardDto`.
  ```json
  {
    "data": [
      {
        "id": "uuid", // id z tabeli learning_schedules
        "flashcard_id": "uuid",
        "front": "string",
        "back": "string",
        "next_review_date": "string<date-time>"
      }
    ]
  }
  ```
- **Błędy**:
  - `400 Bad Request`: Nieprawidłowe parametry zapytania.
  - `401 Unauthorized`: Użytkownik nie jest zalogowany.
  - `500 Internal Server Error`: Wystąpił błąd serwera.

## 5. Przepływ danych
1.  Żądanie `GET` trafia do punktu końcowego (`/src/pages/api/v1/learning/session.ts`).
2.  Middleware Astro weryfikuje token JWT.
3.  Punkt końcowy waliduje parametry `setId` i `limit` za pomocą Zod.
4.  Wywoływana jest funkcja `getReviewSession` z nowego serwisu `src/lib/services/learningService.ts`.
5.  Serwis konstruuje zapytanie do tabeli `learning_schedules` w Supabase.
6.  Zapytanie musi:
    - Filtrować po `user_id` zalogowanego użytkownika.
    - Filtrować rekordy, gdzie `next_review_date <= now()`.
    - Dołączyć (`join`) dane z tabeli `flashcards`, aby pobrać `front` i `back`.
    - Jeśli podano `setId`, dodatkowo filtrować po `flashcards.flashcard_set_id`.
    - Zastosować `limit`.
7.  Serwis mapuje wyniki na tablicę `LearningSessionFlashcardDto`.
8.  Punkt końcowy zwraca `200 OK` z danymi.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie**: Weryfikacja tokenu JWT w middleware.
- **Autoryzacja**: Polityka RLS na tabeli `learning_schedules` i `flashcards` zapewnia, że użytkownik może pobrać tylko własne dane. Zapytanie w serwisie i tak powinno jawnie filtrować po `user_id`.

## 7. Obsługa błędów
- **Nieprawidłowe dane (`400 Bad Request`)**: Obsługiwane przez walidację Zod.
- **Brak uwierzytelnienia (`401 Unauthorized`)**: Obsługiwane przez middleware.
- **Błąd serwera (`500 Internal Server Error`)**: W przypadku błędu zapytania do bazy. Należy go zarejestrować.

## 8. Rozważania dotyczące wydajności
- **Kluczowy jest indeks** na kolumnach `(user_id, next_review_date)` w tabeli `learning_schedules`, aby efektywnie wyszukiwać sesje powtórek dla danego użytkownika.
- Indeksy na kluczach obcych używanych w `JOIN` są również istotne.

## 9. Etapy wdrożenia
1.  **Utworzenie serwisu**: Stwórz plik `src/lib/services/learningService.ts`.
2.  **Implementacja logiki serwisu**: Dodaj funkcję `getReviewSession(supabase: SupabaseClient, userId: string, options: { setId?: string; limit: number }): Promise<{ data: LearningSessionFlashcardDto[] | null; error: any }>`.
3.  **Utworzenie pliku punktu końcowego**: Stwórz plik `src/pages/api/v1/learning/session.ts`.
4.  **Implementacja handlera `GET`**: Zaimplementuj walidację parametrów, wywołanie serwisu, obsługę błędów i zwracanie odpowiedzi.
5.  **Dodanie indeksu**: Utwórz migrację bazy danych, która dodaje złożony indeks na `learning_schedules(user_id, next_review_date)`.
6.  **Testowanie**: Przygotuj testy weryfikujące: pobieranie sesji, filtrowanie po `setId`, działanie limitu i obsługę błędów.

