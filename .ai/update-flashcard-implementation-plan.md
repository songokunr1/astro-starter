# API Endpoint Implementation Plan: PATCH /api/v1/flashcards/{flashcardId}

## 1. Przegląd punktu końcowego
Ten punkt końcowy umożliwia uwierzytelnionemu użytkownikowi aktualizację treści istniejącej fiszki.

## 2. Szczegóły żądania
- **Metoda HTTP**: `PATCH`
- **Struktura URL**: `/api/v1/flashcards/{flashcardId}`
- **Parametry**:
  - **Wymagane**:
    - `flashcardId` (parametr ścieżki): UUID fiszki do aktualizacji.
- **Request Body**: Obiekt JSON z opcjonalnymi polami `front`, `back`, `media_url`.
  ```json
  {
    "front": "string (optional, max: 200 chars)",
    "back": "string (optional, max: 200 chars)",
    "media_url": "string (optional)"
  }
  ```

## 3. Wykorzystywane typy
- **DTOs**:
  - `FlashcardDto`: Zwracany jako odpowiedź po pomyślnej aktualizacji.
- **Command Modele**:
  - `UpdateFlashcardCommand`: Reprezentuje dane wejściowe do aktualizacji.
- **Walidacja**:
  - Schemat Zod dla `flashcardId` (musi być UUID).
  - Schemat Zod dla `UpdateFlashcardCommand`.

## 4. Szczegóły odpowiedzi
- **Sukces (`200 OK`)**: Zwraca zaktualizowany obiekt `FlashcardDto`.
- **Błędy**:
  - `400 Bad Request`: Nieprawidłowy `flashcardId` lub dane wejściowe.
  - `401 Unauthorized`: Użytkownik nie jest zalogowany.
  - `404 Not Found`: Fiszka o podanym `flashcardId` nie istnieje lub nie należy do użytkownika.
  - `500 Internal Server Error`: Wystąpił błąd serwera.

## 5. Przepływ danych
1.  Żądanie `PATCH` trafia do punktu końcowego Astro (`/src/pages/api/v1/flashcards/[flashcardId].ts`).
2.  Middleware Astro weryfikuje token JWT.
3.  Punkt końcowy waliduje parametr `flashcardId` oraz ciało żądania.
4.  Wywoływana jest funkcja `updateFlashcard` z serwisu `src/lib/services/flashcardService.ts`.
5.  Serwis wykonuje zapytanie `update()` w tabeli `flashcards`. Warunek `where` musi obejmować zarówno `id = flashcardId`, jak i sprawdzenie, czy fiszka należy do zalogowanego użytkownika (poprzez `join` z `flashcard_sets` i sprawdzenie `user_id`).
6.  Polityka RLS na tabeli `flashcards` stanowi drugą, kluczową warstwę autoryzacji.
7.  Jeśli zapytanie `update` nie zmodyfikuje żadnego wiersza, oznacza to, że fiszka nie została znaleziona lub użytkownik nie ma do niej uprawnień. Serwis zwraca odpowiedni błąd.
8.  Po pomyślnej aktualizacji, `.select().single()` zwraca zaktualizowany rekord.
9.  Punkt końcowy zwraca `200 OK` z zaktualizowaną fiszką.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie**: Weryfikacja tokenu JWT w middleware.
- **Autoryzacja**: Polityka RLS dla operacji `UPDATE` na `flashcards` jest niezbędna. Musi ona weryfikować własność poprzez sprawdzenie `user_id` w powiązanym zestawie. Próba modyfikacji cudzej fiszki musi skutkować błędem `404 Not Found`.
- **Walidacja danych wejściowych**: `flashcardId` (UUID) oraz treść fiszki muszą być walidowane.

## 7. Obsługa błędów
- **Nieprawidłowe dane (`400 Bad Request`)**: Obsługiwane przez walidację Zod.
- **Brak uwierzytelnienia (`401 Unauthorized`)**: Obsługiwane przez middleware.
- **Nie znaleziono zasobu (`404 Not Found`)**: Jeśli zapytanie `update` nie znajdzie rekordu pasującego do `flashcardId` i `user_id`.
- **Błąd serwera (`500 Internal Server Error`)**: W przypadku nieoczekiwanego błędu bazy danych.

## 8. Rozważania dotyczące wydajności
- Zapytanie `UPDATE` z `JOIN` w celu weryfikacji właściciela jest nieco bardziej złożone, ale przy prawidłowych indeksach na kluczach obcych (`flashcard_set_id`) i głównych (`id`) jego wydajność będzie dobra.

## 9. Etapy wdrożenia
1.  **Aktualizacja serwisu**: W `src/lib/services/flashcardService.ts` dodaj funkcję:
    - `updateFlashcard(supabase: SupabaseClient, userId: string, flashcardId: string, command: UpdateFlashcardCommand): Promise<{ data: FlashcardDto | null; error: any }>`.
2.  **Utworzenie pliku punktu końcowego**: Stwórz plik `src/pages/api/v1/flashcards/[flashcardId].ts`.
3.  **Implementacja handlera `PATCH`**:
    - Dodaj logikę walidacji `params.flashcardId` i ciała żądania.
    - Pobierz `user` z `locals`.
    - Wywołaj `flashcardService.updateFlashcard`.
    - Jeśli `data` jest `null` (bo operacja `update` nic nie zmieniła), zwróć `404`.
    - Obsłuż inne błędy i w razie potrzeby zwróć `500`.
    - Po sukcesie zwróć `200` z zaktualizowanymi danymi.
4.  **Testowanie**: Przygotuj testy weryfikujące: pomyślną aktualizację, próbę modyfikacji cudzej fiszki, błędy walidacji i brak autoryzacji.

