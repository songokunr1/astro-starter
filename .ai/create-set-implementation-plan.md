# API Endpoint Implementation Plan: POST /api/v1/sets

## 1. Przegląd punktu końcowego
Ten punkt końcowy umożliwia uwierzytelnionemu użytkownikowi ręczne utworzenie nowego, pustego zestawu fiszek. Wymaga podania nazwy zestawu i opcjonalnie opisu.

## 2. Szczegóły żądania
- **Metoda HTTP**: `POST`
- **Struktura URL**: `/api/v1/sets`
- **Parametry**: Brak.
- **Request Body**:
  ```json
  {
    "name": "string (required, non-empty)",
    "description": "string (optional)"
  }
  ```

## 3. Wykorzystywane typy
- **DTOs**:
  - `FlashcardSetSummaryDto`: Zwracany jako odpowiedź po pomyślnym utworzeniu zestawu.
- **Command Modele**:
  - `CreateFlashcardSetCommand`: Reprezentuje dane wejściowe do utworzenia zestawu.
- **Walidacja**:
  - Schemat Zod do walidacji `CreateFlashcardSetCommand`.

## 4. Szczegóły odpowiedzi
- **Sukces (`201 Created`)**: Zwraca nowo utworzony obiekt `FlashcardSetSummaryDto`.
  ```json
  {
    "id": "uuid",
    "name": "string",
    "description": "string | null",
    "created_at": "string<date-time>",
    "updated_at": "string<date-time>"
  }
  ```
- **Błędy**:
  - `400 Bad Request`: Nieprawidłowe dane wejściowe (np. pusta nazwa).
  - `401 Unauthorized`: Użytkownik nie jest zalogowany.
  - `500 Internal Server Error`: Wystąpił błąd serwera podczas tworzenia zasobu.

## 5. Przepływ danych
1.  Żądanie `POST` trafia do punktu końcowego Astro (`/src/pages/api/v1/sets.ts`).
2.  Middleware Astro weryfikuje token JWT użytkownika.
3.  Punkt końcowy waliduje ciało żądania za pomocą schematu Zod (`name` jest wymagane).
4.  Wywoływana jest funkcja `createFlashcardSet` z serwisu `src/lib/services/flashcardSetService.ts`.
5.  Serwis pobiera `user.id` z `locals` i łączy go z danymi z `CreateFlashcardSetCommand`.
6.  Wykonywana jest operacja `insert()` w tabeli `flashcard_sets` w Supabase, a następnie `.select().single()` w celu atomowego zwrócenia nowo utworzonego wiersza.
7.  Polityka RLS na tabeli `flashcard_sets` zapewni, że operacja powiedzie się dla uwierzytelnionego użytkownika.
8.  Punkt końcowy otrzymuje utworzony `FlashcardSetSummaryDto` i zwraca go w odpowiedzi `201 Created`.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie**: Token JWT musi być zweryfikowany przez middleware.
- **Autoryzacja**: Logika serwisu musi zapewnić, że `user_id` jest pobierane z sesji uwierzytelnionego użytkownika, a nie przekazywane w ciele żądania. Polityka RLS dla operacji `INSERT` dodatkowo zabezpiecza ten proces.
- **Walidacja danych wejściowych**: Rygorystyczna walidacja `name` i `description` za pomocą Zod jest konieczna, aby zapobiec pustym danym i potencjalnym atakom (np. XSS).

## 7. Obsługa błędów
- **Nieprawidłowe dane (`400 Bad Request`)**: Obsługiwane przez walidację Zod.
- **Brak uwierzytelnienia (`401 Unauthorized`)**: Obsługiwane przez middleware.
- **Błąd serwera (`500 Internal Server Error`)**: W przypadku, gdy operacja `insert` w bazie danych zakończy się niepowodzeniem. Błąd należy zarejestrować w tabeli `system_logs` z typem `DB_INSERT_ERROR`.

## 8. Rozważania dotyczące wydajności
- Operacja `INSERT` jest bardzo wydajna. Nie przewiduje się problemów z wydajnością.

## 9. Etapy wdrożenia
1.  **Utworzenie/Aktualizacja serwisu**: W `src/lib/services/flashcardSetService.ts` dodaj funkcję:
    - `createFlashcardSet(supabase: SupabaseClient, userId: string, command: CreateFlashcardSetCommand): Promise<{ data: FlashcardSetSummaryDto | null; error: any }>`.
2.  **Utworzenie pliku punktu końcowego**: Stwórz plik `src/pages/api/v1/sets.ts`.
3.  **Implementacja handlera `POST`**:
    - Zdefiniuj schemat Zod dla `CreateFlashcardSetCommand`.
    - Zwaliduj ciało żądania.
    - Pobierz `user` z `locals`. Jeśli go nie ma, zwróć `401`.
    - Wywołaj `flashcardSetService.createFlashcardSet`.
    - Obsłuż błędy z serwisu i w razie potrzeby zwróć `500`.
    - Jeśli operacja się powiedzie, zwróć `201` z nowo utworzonym zasobem.
4.  **Testowanie**: Dodaj testy dla serwisu i punktu końcowego, weryfikując pomyślne tworzenie, błędy walidacji i brak autoryzacji.

