# API Endpoint Implementation Plan: GET /api/v1/sets/{setId}

## 1. Przegląd punktu końcowego
Ten punkt końcowy pobiera pojedynczy zestaw fiszek (`flashcard_set`) na podstawie jego unikalnego identyfikatora (`setId`), włączając w to wszystkie powiązane z nim fiszki (`flashcards`). Dostęp jest ograniczony tylko do zestawów należących do uwierzytelnionego użytkownika.

## 2. Szczegóły żądania
- **Metoda HTTP**: `GET`
- **Struktura URL**: `/api/v1/sets/{setId}`
- **Parametry**:
  - **Wymagane**:
    - `setId` (parametr ścieżki): UUID zestawu fiszek do pobrania.
  - **Opcjonalne**: Brak.
- **Request Body**: Brak.

## 3. Wykorzystywane typy
- **DTOs**:
  - `FlashcardSetDetailDto`: Obiekt odpowiedzi zawierający szczegóły zestawu i listę fiszek.
  - `FlashcardSetSummaryDto`: Część `FlashcardSetDetailDto` z podsumowaniem zestawu.
  - `FlashcardDto`: Reprezentacja pojedynczej fiszki na liście.
- **Command Modele**: Brak (operacja odczytu).

## 4. Szczegóły odpowiedzi
- **Sukces (`200 OK`)**: Zwraca obiekt `FlashcardSetDetailDto`.
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
- **Błędy**:
  - `400 Bad Request`: `setId` nie jest prawidłowym UUID.
  - `401 Unauthorized`: Użytkownik nie jest zalogowany.
  - `404 Not Found`: Zestaw fiszek o podanym `setId` nie istnieje lub nie należy do użytkownika.
  - `500 Internal Server Error`: Wystąpił nieoczekiwany błąd serwera.

## 5. Przepływ danych
1.  Żądanie `GET` trafia do punktu końcowego Astro (`/src/pages/api/v1/sets/[setId].ts`).
2.  Middleware Astro (`/src/middleware/index.ts`) weryfikuje token JWT użytkownika. Jeśli jest nieprawidłowy, zwraca `401 Unauthorized`.
3.  Punkt końcowy waliduje parametr `setId` przy użyciu Zod, sprawdzając, czy jest to prawidłowy UUID.
4.  Wywoływana jest funkcja `getFlashcardSetById` z nowego serwisu `src/lib/services/flashcardSetService.ts`.
5.  Serwis wykonuje zapytanie do bazy danych Supabase, aby pobrać zestaw fiszek (`flashcard_sets`) wraz z zagnieżdżonymi fiszkami (`flashcards`).
6.  Polityka RLS (Row-Level Security) w Supabase automatycznie zapewnia, że zapytanie zwróci dane tylko wtedy, gdy `user_id` w tabeli `flashcard_sets` pasuje do ID uwierzytelnionego użytkownika (`auth.uid()`).
7.  Serwis mapuje wynik z bazy danych na `FlashcardSetDetailDto` i zwraca go do punktu końcowego.
8.  Punkt końcowy serializuje DTO do formatu JSON i wysyła odpowiedź `200 OK`.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie**: Wszystkie żądania muszą zawierać prawidłowy nagłówek `Authorization: Bearer <SUPABASE_JWT>`. Weryfikacja odbywa się w middleware Astro.
- **Autoryzacja**: Dostęp do danych jest kontrolowany na poziomie bazy danych przez polityki RLS Supabase. Punkt końcowy nie musi implementować dodatkowej logiki sprawdzającej własność zasobu. Próba dostępu do cudzego zasobu skutkuje błędem `404 Not Found`.
- **Walidacja danych wejściowych**: Parametr `setId` musi być walidowany jako UUID, aby zapobiec błędom zapytań i potencjalnym atakom.

## 7. Obsługa błędów
- **Brak uwierzytelnienia (`401 Unauthorized`)**: Obsługiwane globalnie przez middleware.
- **Nieprawidłowy `setId` (`400 Bad Request`)**: Walidacja Zod w punkcie końcowym. Odpowiedź powinna zawierać komunikat o błędzie walidacji.
- **Nie znaleziono zasobu (`404 Not Found`)**: Gdy zapytanie do bazy danych nie zwróci żadnych wyników.
- **Błąd serwera (`500 Internal Server Error`)**: W przypadku nieoczekiwanych błędów bazy danych lub serwisu. Błąd powinien zostać zarejestrowany w tabeli `system_logs` z typem `DB_FETCH_ERROR`, zawierając `setId` i ID użytkownika w metadanych.

## 8. Rozważania dotyczące wydajności
- Zapytanie powinno wykorzystywać zagnieżdżone `select`, aby pobrać zestaw i jego fiszki w jednym zapytaniu do bazy danych, co minimalizuje opóźnienia sieciowe.
- Indeksy na kluczach obcych (`flashcards.flashcard_set_id`) oraz na `flashcard_sets.user_id` są kluczowe dla wydajności zapytań.
- Należy filtrować usunięte programowo rekordy (`deleted_at IS NULL`), co wymaga indeksów na tych kolumnach.

## 9. Etapy wdrożenia
1.  **Utworzenie pliku serwisu**: Stwórz plik `src/lib/services/flashcardSetService.ts`.
2.  **Implementacja logiki serwisu**:
    - Dodaj funkcję `getFlashcardSetById(supabase: SupabaseClient, setId: string): Promise<FlashcardSetDetailDto | null>`.
    - Wewnątrz funkcji zaimplementuj zapytanie Supabase do tabeli `flashcard_sets` z zagnieżdżonym `select`em dla `flashcards`.
    - Upewnij się, że zapytanie filtruje rekordy z `deleted_at IS NOT NULL`.
    - Zaimplementuj mapowanie wyniku na `FlashcardSetDetailDto`.
3.  **Utworzenie pliku punktu końcowego**: Stwórz plik `src/pages/api/v1/sets/[setId].ts`.
4.  **Implementacja logiki punktu końcowego**:
    - Zdefiniuj `export const prerender = false;`.
    - Zaimplementuj handler `GET({ params, locals })`.
    - Pobierz klienta Supabase z `locals.supabase`.
    - Zwaliduj `params.setId` przy użyciu `z.string().uuid()`. W razie błędu zwróć `400`.
    - Wywołaj `getFlashcardSetById` z serwisu.
    - Jeśli wynik jest `null`, zwróć odpowiedź `404`.
    - Jeśli wystąpi błąd, zaloguj go i zwróć `500`.
    - Jeśli wszystko się powiedzie, zwróć odpowiedź `200` z pobranymi danymi.
5.  **Testowanie**: Przygotuj testy jednostkowe dla serwisu i integracyjne dla punktu końcowego, obejmujące scenariusze sukcesu i błędów.
