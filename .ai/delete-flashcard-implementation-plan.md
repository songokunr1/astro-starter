# API Endpoint Implementation Plan: DELETE /api/v1/flashcards/{flashcardId}

## 1. Przegląd punktu końcowego
Ten punkt końcowy służy do miękkiego usuwania (soft-delete) pojedynczej fiszki. Operacja polega na ustawieniu znacznika czasu w kolumnie `deleted_at`.

## 2. Szczegóły żądania
- **Metoda HTTP**: `DELETE`
- **Struktura URL**: `/api/v1/flashcards/{flashcardId}`
- **Parametry**:
  - **Wymagane**:
    - `flashcardId` (parametr ścieżki): UUID fiszki do usunięcia.
- **Request Body**: Brak.

## 3. Wykorzystywane typy
- **DTOs**: Brak.
- **Command Modele**: Brak.
- **Walidacja**:
  - Schemat Zod dla `flashcardId` (musi być UUID).

## 4. Szczegóły odpowiedzi
- **Sukces (`204 No Content`)**: Operacja zakończyła się pomyślnie.
- **Błędy**:
  - `400 Bad Request`: Nieprawidłowy format `flashcardId`.
  - `401 Unauthorized`: Użytkownik nie jest zalogowany.
  - `404 Not Found`: Fiszka o podanym `flashcardId` nie istnieje lub nie należy do użytkownika.
  - `500 Internal Server Error`: Wystąpił błąd serwera.

## 5. Przepływ danych
1.  Żądanie `DELETE` trafia do punktu końcowego Astro (`/src/pages/api/v1/flashcards/[flashcardId].ts`).
2.  Middleware Astro weryfikuje token JWT.
3.  Punkt końcowy waliduje parametr `flashcardId`.
4.  Wywoływana jest funkcja `deleteFlashcard` z serwisu `src/lib/services/flashcardService.ts`.
5.  Serwis wykonuje zapytanie `update({ deleted_at: new Date() })` w tabeli `flashcards`. Warunek `where` musi obejmować `id = flashcardId` oraz sprawdzenie własności (przez `join` z `flashcard_sets` lub poleganie na RLS).
6.  Polityka RLS jest ostatecznym mechanizmem autoryzacji.
7.  Jeśli operacja `update` nie zmodyfikuje żadnego wiersza, serwis zwraca błąd, który punkt końcowy mapuje na `404 Not Found`.
8.  Po pomyślnym wykonaniu, punkt końcowy zwraca `204 No Content`.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie**: Weryfikacja tokenu JWT w middleware.
- **Autoryzacja**: Polityka RLS dla operacji `DELETE` (lub `UPDATE` w przypadku soft-delete) na tabeli `flashcards` jest kluczowa, aby uniemożliwić usuwanie cudzych fiszek.
- **Walidacja danych wejściowych**: `flashcardId` musi być walidowane jako UUID.

## 7. Obsługa błędów
- **Nieprawidłowy `flashcardId` (`400 Bad Request`)**: Obsługiwane przez walidację Zod.
- **Brak uwierzytelnienia (`401 Unauthorized`)**: Obsługiwane przez middleware.
- **Nie znaleziono zasobu (`404 Not Found`)**: Jeśli fiszka nie istnieje lub użytkownik nie ma do niej uprawnień.
- **Błąd serwera (`500 Internal Server Error`)**: W przypadku nieoczekiwanego błędu bazy danych.

## 8. Rozważania dotyczące wydajności
- Operacja `UPDATE` na indeksowanej kolumnie jest bardzo wydajna. Nie przewiduje się problemów.

## 9. Etapy wdrożenia
1.  **Aktualizacja serwisu**: W `src/lib/services/flashcardService.ts` dodaj funkcję:
    - `deleteFlashcard(supabase: SupabaseClient, userId: string, flashcardId: string): Promise<{ error: any }>`.
2.  **Aktualizacja punktu końcowego**: W `src/pages/api/v1/flashcards/[flashcardId].ts` dodaj handler dla metody `DELETE`.
3.  **Implementacja handlera `DELETE`**:
    - Zwaliduj `params.flashcardId`.
    - Pobierz `user` z `locals`.
    - Wywołaj `flashcardService.deleteFlashcard`.
    - Jeśli `error` wskazuje, że nie znaleziono rekordu, zwróć `404`.
    - W przypadku innego błędu, zaloguj go i zwróć `500`.
    - Po sukcesie zwróć `204`.
4.  **Testowanie**: Przygotuj testy weryfikujące: pomyślne usunięcie, próbę usunięcia cudzej fiszki, błędy walidacji `flashcardId` i brak autoryzacji.

