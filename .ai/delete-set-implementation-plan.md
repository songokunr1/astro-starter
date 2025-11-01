# API Endpoint Implementation Plan: DELETE /api/v1/sets/{setId}

## 1. Przegląd punktu końcowego
Ten punkt końcowy służy do miękkiego usuwania (soft-delete) zestawu fiszek wraz ze wszystkimi powiązanymi z nim fiszkami. Operacja polega na ustawieniu znacznika czasu w kolumnie `deleted_at`.

## 2. Szczegóły żądania
- **Metoda HTTP**: `DELETE`
- **Struktura URL**: `/api/v1/sets/{setId}`
- **Parametry**:
  - **Wymagane**:
    - `setId` (parametr ścieżki): UUID zestawu fiszek do usunięcia.
- **Request Body**: Brak.

## 3. Wykorzystywane typy
- **DTOs**: Brak.
- **Command Modele**: Brak.
- **Walidacja**:
  - Schemat Zod dla `setId` (musi być UUID).

## 4. Szczegóły odpowiedzi
- **Sukces (`204 No Content`)**: Operacja zakończyła się pomyślnie. Brak treści w odpowiedzi.
- **Błędy**:
  - `400 Bad Request`: Nieprawidłowy format `setId`.
  - `401 Unauthorized`: Użytkownik nie jest zalogowany.
  - `404 Not Found`: Zestaw o podanym `setId` nie istnieje lub nie należy do użytkownika.
  - `500 Internal Server Error`: Wystąpił błąd serwera.

## 5. Przepływ danych
1.  Żądanie `DELETE` trafia do punktu końcowego Astro (`/src/pages/api/v1/sets/[setId].ts`).
2.  Middleware Astro weryfikuje token JWT.
3.  Punkt końcowy waliduje parametr `setId` jako UUID.
4.  Wywoływana jest funkcja `deleteFlashcardSet` z serwisu `src/lib/services/flashcardSetService.ts`.
5.  **Opcja A (RPC)**: Serwis wywołuje funkcję `rpc('soft_delete_flashcard_set', { set_id: setId })` w Supabase, która w ramach jednej transakcji:
    - Aktualizuje `deleted_at = now()` w tabeli `flashcard_sets` dla danego `setId`.
    - Aktualizuje `deleted_at = now()` w tabeli `flashcards` dla wszystkich fiszek, gdzie `flashcard_set_id = setId`.
6.  **Opcja B (Dwa zapytania)**: Serwis wykonuje dwa oddzielne zapytania `update()`: jedno na `flashcard_sets`, drugie na `flashcards`. Ta opcja jest prostsza, ale nie gwarantuje atomowości. Ze względu na prostotę operacji, jest to akceptowalne ryzyko. **Wybieramy opcję B dla uproszczenia implementacji.**
7.  Polityka RLS zapewnia, że operacja jest możliwa tylko dla właściciela zestawu.
8.  Jeśli operacja `update` na `flashcard_sets` nie zmodyfikuje żadnego wiersza (bo nie znaleziono rekordu lub RLS zablokował), serwis zwraca błąd.
9.  Punkt końcowy zwraca `204 No Content` po pomyślnym wykonaniu operacji.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie**: Weryfikacja tokenu JWT w middleware.
- **Autoryzacja**: Polityka RLS jest kluczowa. Uniemożliwia usunięcie zestawu fiszek należącego do innego użytkownika. Próba taka zakończy się błędem `404 Not Found`, ponieważ zapytanie `update` nie znajdzie pasującego rekordu.
- **Walidacja danych wejściowych**: `setId` musi być walidowane jako prawidłowy UUID.

## 7. Obsługa błędów
- **Nieprawidłowy `setId` (`400 Bad Request`)**: Obsługiwane przez walidację Zod.
- **Brak uwierzytelnienia (`401 Unauthorized`)**: Obsługiwane przez middleware.
- **Nie znaleziono zasobu (`404 Not Found`)**: Jeśli zapytanie `update` nie zaktualizuje żadnego wiersza w tabeli `flashcard_sets`.
- **Błąd serwera (`500 Internal Server Error`)**: W przypadku nieoczekiwanego błędu bazy danych. Należy go zarejestrować w `system_logs`.

## 8. Rozważania dotyczące wydajności
- Wykonanie dwóch operacji `UPDATE` jest nieco wolniejsze niż pojedyncza operacja, ale obie działają na indeksowanych kolumnach (`id` i `flashcard_set_id`), więc powinny być szybkie.
- Użycie funkcji RPC (Opcja A) byłoby minimalnie bardziej wydajne, ponieważ wymaga tylko jednego przejścia sieciowego do bazy danych.

## 9. Etapy wdrożenia
1.  **Aktualizacja serwisu**: W `src/lib/services/flashcardSetService.ts` dodaj funkcję:
    - `deleteFlashcardSet(supabase: SupabaseClient, setId: string): Promise<{ error: any }>`.
    - Wewnątrz funkcji, wykonaj najpierw `update` na `flashcard_sets`, a następnie na `flashcards`, ustawiając `deleted_at`. Sprawdź błędy po każdej operacji.
2.  **Aktualizacja punktu końcowego**: W pliku `src/pages/api/v1/sets/[setId].ts` dodaj handler dla metody `DELETE`.
3.  **Implementacja handlera `DELETE`**:
    - Zwaliduj `params.setId`.
    - Wywołaj `flashcardSetService.deleteFlashcardSet`.
    - Jeśli serwis zwróci błąd `404` (np. przez `error.details.includes('0 rows')`), zwróć `404`.
    - W przypadku innego błędu, zaloguj go i zwróć `500`.
    - Jeśli operacja się powiedzie, zwróć `204`.
4.  **Testowanie**: Dodaj testy weryfikujące: pomyślne usunięcie zestawu i jego fiszek, próbę usunięcia cudzego zestawu, próbę usunięcia nieistniejącego zestawu, błędy walidacji `setId`.

