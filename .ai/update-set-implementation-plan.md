# API Endpoint Implementation Plan: PATCH /api/v1/sets/{setId}

## 1. Przegląd punktu końcowego
Ten punkt końcowy umożliwia uwierzytelnionemu użytkownikowi aktualizację nazwy i/lub opisu istniejącego zestawu fiszek.

## 2. Szczegóły żądania
- **Metoda HTTP**: `PATCH`
- **Struktura URL**: `/api/v1/sets/{setId}`
- **Parametry**:
  - **Wymagane**:
    - `setId` (parametr ścieżki): UUID zestawu fiszek do aktualizacji.
- **Request Body**: Obiekt JSON z opcjonalnymi polami `name` i `description`.
  ```json
  {
    "name": "string (optional, non-empty)",
    "description": "string (optional)"
  }
  ```

## 3. Wykorzystywane typy
- **DTOs**:
  - `FlashcardSetSummaryDto`: Zwracany jako odpowiedź po pomyślnej aktualizacji.
- **Command Modele**:
  - `UpdateFlashcardSetCommand`: Reprezentuje dane wejściowe do aktualizacji.
- **Walidacja**:
  - Schemat Zod dla `setId` (musi być UUID).
  - Schemat Zod dla `UpdateFlashcardSetCommand` (`name` nie może być pustym stringiem).

## 4. Szczegóły odpowiedzi
- **Sukces (`200 OK`)**: Zwraca zaktualizowany obiekt `FlashcardSetSummaryDto`.
- **Błędy**:
  - `400 Bad Request`: Nieprawidłowy `setId` lub dane wejściowe.
  - `401 Unauthorized`: Użytkownik nie jest zalogowany.
  - `404 Not Found`: Zestaw o podanym `setId` nie istnieje lub nie należy do użytkownika.
  - `500 Internal Server Error`: Wystąpił błąd serwera.

## 5. Przepływ danych
1.  Żądanie `PATCH` trafia do punktu końcowego Astro (`/src/pages/api/v1/sets/[setId].ts`).
2.  Middleware Astro weryfikuje token JWT.
3.  Punkt końcowy waliduje parametr `setId` (musi być UUID) oraz ciało żądania.
4.  Wywoływana jest funkcja `updateFlashcardSet` z serwisu `src/lib/services/flashcardSetService.ts`.
5.  Serwis wykonuje zapytanie `update()` w tabeli `flashcard_sets` dla wiersza o podanym `id`.
6.  Polityka RLS (`"Users can manage their own flashcard sets."`) automatycznie filtruje zapytanie, zezwalając na aktualizację tylko wtedy, gdy `user_id` pasuje do `auth.uid()`.
7.  Po aktualizacji używane jest `.select().single()`, aby zwrócić zaktualizowany rekord.
8.  Punkt końcowy zwraca zaktualizowany obiekt w odpowiedzi `200 OK`.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie**: Weryfikacja tokenu JWT w middleware.
- **Autoryzacja**: Polityka RLS jest kluczowa. Zapewnia ona, że użytkownik nie może zmodyfikować zestawu fiszek innego użytkownika, nawet jeśli zna jego `setId`. Próba taka zakończy się błędem `404 Not Found`.
- **Walidacja danych wejściowych**: `setId` musi być walidowane jako UUID, a `name` nie może być puste.

## 7. Obsługa błędów
- **Nieprawidłowe dane (`400 Bad Request`)**: Obsługiwane przez walidację Zod na `setId` i ciele żądania.
- **Brak uwierzytelnienia (`401 Unauthorized`)**: Obsługiwane przez middleware.
- **Nie znaleziono zasobu (`404 Not Found`)**: Jeśli zapytanie `update` nie znajdzie pasującego rekordu (ze względu na `id` lub politykę RLS).
- **Błąd serwera (`500 Internal Server Error`)**: W przypadku nieoczekiwanego błędu bazy danych. Należy go zarejestrować w `system_logs`.

## 8. Rozważania dotyczące wydajności
- Operacja `UPDATE` na kluczu głównym (`id`) jest wysoce zoptymalizowana i wydajna. Nie przewiduje się problemów.

## 9. Etapy wdrożenia
1.  **Aktualizacja serwisu**: W `src/lib/services/flashcardSetService.ts` dodaj funkcję:
    - `updateFlashcardSet(supabase: SupabaseClient, setId: string, command: UpdateFlashcardSetCommand): Promise<{ data: FlashcardSetSummaryDto | null; error: any }>`.
2.  **Utworzenie/Aktualizacja punktu końcowego**: W pliku `src/pages/api/v1/sets/[setId].ts` dodaj handler dla metody `PATCH`.
3.  **Implementacja handlera `PATCH`**:
    - Zdefiniuj i użyj schematów Zod do walidacji `params.setId` i ciała żądania.
    - Wywołaj `flashcardSetService.updateFlashcardSet`.
    - Jeśli `data` jest `null`, zwróć `404`.
    - Obsłuż błędy z serwisu, logując je i zwracając `500`.
    - W razie sukcesu zwróć `200` ze zaktualizowanymi danymi.
4.  **Testowanie**: Dodaj testy weryfikujące: pomyślną aktualizację, próbę aktualizacji cudzego zestawu, błędy walidacji i brak autoryzacji.

