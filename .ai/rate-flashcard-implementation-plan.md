# API Endpoint Implementation Plan: POST /api/v1/flashcards/{flashcardId}/rate

## 1. Przegląd punktu końcowego
Ten punkt końcowy umożliwia użytkownikowi ocenę ("kciuk w górę" lub "kciuk w dół") fiszki wygenerowanej przez AI. Informacja zwrotna jest zapisywana w tabeli `flashcard_ratings` i może służyć do ulepszania modeli AI.

## 2. Szczegóły żądania
- **Metoda HTTP**: `POST`
- **Struktura URL**: `/api/v1/flashcards/{flashcardId}/rate`
- **Parametry**:
  - **Wymagane**:
    - `flashcardId`: UUID ocenianej fiszki.
- **Request Body**:
  ```json
  {
    "rating": "integer (required, 1 for up, -1 for down)"
  }
  ```

## 3. Wykorzystywane typy
- **Command Modele**:
  - `RateFlashcardCommand`: Reprezentuje dane wejściowe.
- **Walidacja**:
  - Schemat Zod dla `flashcardId` (UUID).
  - Schemat Zod dla `RateFlashcardCommand` (`rating` musi być `1` lub `-1`).

## 4. Szczegóły odpowiedzi
- **Sukces (`201 Created`)**: Zwraca prosty komunikat o powodzeniu.
  ```json
  { "message": "Rating submitted successfully." }
  ```
- **Błędy**:
  - `400 Bad Request`: Nieprawidłowe dane wejściowe.
  - `401 Unauthorized`: Użytkownik nie jest zalogowany.
  - `404 Not Found`: Fiszka o podanym ID nie istnieje lub nie należy do użytkownika.
  - `409 Conflict`: Użytkownik już ocenił tę fiszkę.
  - `500 Internal Server Error`: Wystąpił błąd serwera.

## 5. Przepływ danych
1.  Żądanie `POST` trafia do punktu końcowego (`/src/pages/api/v1/flashcards/[flashcardId]/rate.ts`).
2.  Middleware Astro weryfikuje token JWT.
3.  Punkt końcowy waliduje `flashcardId` oraz ciało żądania.
4.  Wywoływana jest funkcja `rateFlashcard` z serwisu `src/lib/services/flashcardService.ts`.
5.  Serwis najpierw sprawdza, czy fiszka o podanym `flashcardId` w ogóle istnieje (nie musi sprawdzać własności, bo oceniać mogą wszyscy).
6.  Jeśli fiszka istnieje, serwis próbuje wstawić nowy rekord do tabeli `flashcard_ratings`, zawierający `user_id`, `flashcard_id` i `rating`.
7.  Baza danych obsługuje unikalny constraint na parze `(user_id, flashcard_id)`.
8.  Jeśli wstawienie się powiedzie, punkt końcowy zwraca `201 Created`.
9.  Jeśli baza danych zwróci błąd naruszenia unikalności (kod `23505`), serwis przechwytuje go i zwraca błąd, który jest mapowany na `409 Conflict`.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie**: Weryfikacja tokenu JWT.
- **Autoryzacja**: Polityka RLS dla `INSERT` na `flashcard_ratings` musi zezwalać uwierzytelnionym użytkownikom na wstawianie wpisów z własnym `user_id`.

## 7. Obsługa błędów
- **Nieprawidłowe dane (`400 Bad Request`)**: Obsługiwane przez walidację Zod.
- **Brak uwierzytelnienia (`401 Unauthorized`)**: Obsługiwane przez middleware.
- **Nie znaleziono fiszki (`404 Not Found`)**: Jeśli wstępne sprawdzenie w serwisie nie znajdzie fiszki o danym `flashcardId`.
- **Ocena już istnieje (`409 Conflict`)**: Gdy baza danych zwróci błąd `23505`.
- **Błąd serwera (`500 Internal Server Error`)**: W przypadku innych błędów bazy danych.

## 8. Rozważania dotyczące wydajności
- Operacja `INSERT` z unikalnym constraintem jest bardzo wydajna. Nie przewiduje się problemów.

## 9. Etapy wdrożenia
1.  **Aktualizacja serwisu**: W `src/lib/services/flashcardService.ts` dodaj funkcję `rateFlashcard(supabase: SupabaseClient, userId: string, flashcardId: string, command: RateFlashcardCommand): Promise<{ error: any }>`.
2.  **Utworzenie pliku punktu końcowego**: Stwórz plik `src/pages/api/v1/flashcards/[flashcardId]/rate.ts`.
3.  **Implementacja handlera `POST`**:
    - Zaimplementuj walidację.
    - Pobierz `user` z `locals`.
    - Wywołaj `flashcardService.rateFlashcard`.
    - Zmapuj błędy z serwisu na odpowiednie kody statusu (`404`, `409`, `500`).
    - W razie sukcesu zwróć `201`.
4.  **Testowanie**: Przygotuj testy weryfikujące pomyślne ocenienie, próbę ponownego ocenienia (oczekiwany `409`), ocenianie nieistniejącej fiszki i błędy walidacji.
