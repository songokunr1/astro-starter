# API Endpoint Implementation Plan: POST /api/v1/ai/accept-flashcards

## 1. Przegląd punktu końcowego
Ten punkt końcowy służy do zapisywania w bazie danych zestawu fiszek, który został wcześniej wygenerowany przez AI i zaakceptowany przez użytkownika. Operacja jest transakcyjna – tworzy nowy `flashcard_set` oraz wszystkie powiązane z nim `flashcards`.

## 2. Szczegóły żądania
- **Metoda HTTP**: `POST`
- **Struktura URL**: `/api/v1/ai/accept-flashcards`
- **Parametry**: Brak.
- **Request Body**: Pełna struktura danych otrzymana z endpointu `generate-flashcards`.
  ```json
  {
    "temp_id": "string (required)",
    "setName": "string (required)",
    "source_text": "string (required)",
    "flashcards": [
      { "front": "string", "back": "string" }
    ]
  }
  ```

## 3. Wykorzystywane typy
- **DTOs**:
  - `FlashcardSetSummaryDto`: Zwracany jako odpowiedź po pomyślnym utworzeniu zestawu.
- **Command Modele**:
  - `AcceptFlashcardsCommand`: Reprezentuje dane wejściowe, tożsame z `GenerateFlashcardsResponseDto`.
- **Walidacja**:
  - Schemat Zod do walidacji `AcceptFlashcardsCommand`.

## 4. Szczegóły odpowiedzi
- **Sukces (`201 Created`)**: Zwraca nowo utworzony obiekt `FlashcardSetSummaryDto`.
- **Błędy**:
  - `400 Bad Request`: Nieprawidłowe dane wejściowe.
  - `401 Unauthorized`: Użytkownik nie jest zalogowany.
  - `500 Internal Server Error`: Wystąpił błąd podczas transakcji w bazie danych.

## 5. Przepływ danych
1.  Żądanie `POST` trafia do punktu końcowego (`/src/pages/api/v1/ai/accept-flashcards.ts`).
2.  Middleware Astro weryfikuje token JWT.
3.  Punkt końcowy waliduje całe ciało żądania za pomocą schematu Zod.
4.  Wywoływana jest funkcja `createSetWithFlashcards` z serwisu `src/lib/services/flashcardSetService.ts`.
5.  Serwis wykonuje transakcję w bazie danych, najlepiej za pomocą funkcji RPC w PostgreSQL, aby zapewnić atomowość operacji. Transakcja obejmuje:
    a. `INSERT` do tabeli `flashcard_sets` (z `name`, `source_text`, `user_id`).
    b. Pobranie `id` nowo utworzonego zestawu.
    c. `INSERT` (bulk insert) wszystkich fiszek z `command.flashcards`, przypisując im pobrany `flashcard_set_id`.
6.  Jeśli transakcja się nie powiedzie, baza danych automatycznie wycofa zmiany.
7.  Po pomyślnym wykonaniu transakcji, serwis pobiera podsumowanie nowo utworzonego zestawu.
8.  Punkt końcowy zwraca `201 Created` z obiektem `FlashcardSetSummaryDto`.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie**: Weryfikacja tokenu JWT w middleware.
- **Walidacja danych wejściowych**: Bardzo ważna jest walidacja całej struktury `AcceptFlashcardsCommand`, aby upewnić się, że jest ona zgodna z oczekiwaniami, zanim zostanie przekazana do bazy danych. `temp_id` nie jest walidowany po stronie serwera – służy głównie do śledzenia operacji po stronie klienta.

## 7. Obsługa błędów
- **Nieprawidłowe dane (`400 Bad Request`)**: Obsługiwane przez walidację Zod.
- **Brak uwierzytelnienia (`401 Unauthorized`)**: Obsługiwane przez middleware.
- **Błąd transakcji (`500 Internal Server Error`)**: Jeśli funkcja RPC lub operacje `INSERT` w bazie danych zawiodą. Błąd powinien zostać zarejestrowany w `system_logs` z typem `DB_TRANSACTION_ERROR`.

## 8. Rozważania dotyczące wydajności
- Użycie funkcji RPC w PostgreSQL do przeprowadzenia transakcji jest najbardziej wydajnym podejściem, minimalizując liczbę zapytań sieciowych do bazy.
- Masowe wstawianie (bulk insert) fiszek jest znacznie szybsze niż wstawianie każdej fiszki osobno w pętli.

## 9. Etapy wdrożenia
1.  **Utworzenie migracji bazy danych**:
    - Stwórz nową migrację Supabase.
    - Zdefiniuj w niej funkcję PostgreSQL `create_set_with_flashcards(p_user_id uuid, p_name text, p_source_text text, p_flashcards jsonb)`, która wykonuje całą transakcję.
2.  **Aktualizacja serwisu `flashcardSetService`**:
    - Dodaj funkcję `createSetWithFlashcards(supabase: SupabaseClient, userId: string, command: AcceptFlashcardsCommand): Promise<{ data: FlashcardSetSummaryDto | null; error: any }>`.
    - Wewnątrz funkcji wywołaj nowo utworzoną funkcję RPC: `supabase.rpc('create_set_with_flashcards', { ... })`.
3.  **Utworzenie pliku punktu końcowego**: Stwórz plik `src/pages/api/v1/ai/accept-flashcards.ts`.
4.  **Implementacja handlera `POST`**:
    - Zdefiniuj schemat Zod i zwaliduj ciało żądania.
    - Pobierz `user` z `locals`.
    - Wywołaj `flashcardSetService.createSetWithFlashcards`.
    - Obsłuż błędy i zwróć `500` w razie potrzeby.
    - Po sukcesie zwróć `201` z danymi nowo utworzonego zestawu.
5.  **Testowanie**: Przygotuj testy integracyjne dla całego przepływu: od generacji po akceptację, sprawdzając, czy dane poprawnie zapisują się w bazie danych.



