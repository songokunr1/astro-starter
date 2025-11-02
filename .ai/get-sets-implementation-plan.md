# API Endpoint Implementation Plan: GET /api/v1/sets

## 1. Przegląd punktu końcowego
Ten punkt końcowy pobiera paginowaną listę zestawów fiszek (`flashcard_set`) należących do aktualnie uwierzytelnionego użytkownika. Umożliwia sortowanie i filtrowanie wyników.

## 2. Szczegóły żądania
- **Metoda HTTP**: `GET`
- **Struktura URL**: `/api/v1/sets`
- **Parametry zapytania (Query Parameters)**:
  - `page: integer` (opcjonalny, domyślnie: 1)
  - `pageSize: integer` (opcjonalny, domyślnie: 10)
  - `sortBy: string` (opcjonalny, np. 'name', 'created_at', domyślnie: 'updated_at')
  - `sortOrder: string` (opcjonalny, 'asc' lub 'desc', domyślnie: 'desc')
- **Request Body**: Brak.

## 3. Wykorzystywane typy
- **DTOs**:
  - `FlashcardSetSummaryDto`: Obiekt z podsumowaniem danych zestawu na liście.
  - `PaginatedResponseDto<FlashcardSetSummaryDto>`: Obiekt odpowiedzi zawierający listę zestawów i informacje o paginacji.
- **Command Modele**: Brak.

## 4. Szczegóły odpowiedzi
- **Sukces (`200 OK`)**: Zwraca `PaginatedResponseDto` z danymi.
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "name": "string",
        "description": "string | null",
        "created_at": "string<date-time>",
        "updated_at": "string<date-time>"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "total": 100
    }
  }
  ```
- **Błędy**:
  - `400 Bad Request`: Nieprawidłowe parametry zapytania (np. `page` nie jest liczbą).
  - `401 Unauthorized`: Użytkownik nie jest zalogowany.
  - `500 Internal Server Error`: Wystąpił nieoczekiwany błąd serwera.

## 5. Przepływ danych
1.  Żądanie `GET` trafia do punktu końcowego Astro (`/src/pages/api/v1/sets.ts`).
2.  Middleware Astro (`/src/middleware/index.ts`) weryfikuje token JWT.
3.  Punkt końcowy waliduje parametry zapytania (`page`, `pageSize`, `sortBy`, `sortOrder`) przy użyciu Zod.
4.  Wywoływana jest nowa funkcja `getFlashcardSets` z serwisu `src/lib/services/flashcardSetService.ts`.
5.  Serwis konstruuje i wykonuje zapytanie do Supabase, aby pobrać listę zestawów fiszek dla `user_id`, uwzględniając paginację (`range()`) i sortowanie (`order()`). Wykonuje również osobne zapytanie o łączną liczbę rekordów.
6.  Polityka RLS zapewnia dostęp tylko do danych właściciela.
7.  Serwis mapuje wyniki na `FlashcardSetSummaryDto[]` i zwraca obiekt `PaginatedResponseDto`.
8.  Punkt końcowy serializuje DTO do JSON i wysyła odpowiedź `200 OK`.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie**: Obsługiwane przez middleware Astro, wymagany JWT.
- **Autoryzacja**: Kontrolowana przez RLS w Supabase na podstawie `user_id`.
- **Walidacja danych wejściowych**: Parametry zapytania muszą być walidowane, aby zapobiec błędom i atakom.

## 7. Obsługa błędów
- **Brak uwierzytelnienia (`401 Unauthorized`)**: Obsługiwane przez middleware.
- **Nieprawidłowe parametry (`400 Bad Request`)**: Walidacja Zod w punkcie końcowym.
- **Błąd serwera (`500 Internal Server Error`)**: W przypadku błędów bazy danych. Błąd powinien zostać zalogowany.

## 8. Rozważania dotyczące wydajności
- Użycie paginacji (`range`) jest kluczowe, aby unikać pobierania dużych ilości danych.
- Zapytanie o łączną liczbę rekordów (`count`) powinno być wykonane efektywnie.
- Należy upewnić się, że istnieją indeksy na kolumnach `user_id` oraz tych używanych do sortowania.

## 9. Etapy wdrożenia
1.  **Aktualizacja serwisu**: Zmodyfikuj plik `src/lib/services/flashcardSetService.ts`.
2.  **Implementacja logiki serwisu**:
    - Dodaj funkcję `getFlashcardSets(supabase: SupabaseClient, userId: string, options: { page: number, pageSize: number, sortBy: string, sortOrder: string }): Promise<PaginatedResponseDto<FlashcardSetSummaryDto>>`.
    - Zaimplementuj logikę paginacji i sortowania.
3.  **Utworzenie pliku punktu końcowego**: Stwórz plik `src/pages/api/v1/sets.ts`.
4.  **Implementacja logiki punktu końcowego**:
    - Zaimplementuj handler `GET`.
    - Zwaliduj parametry zapytania.
    - Wywołaj `getFlashcardSets`.
    - Zwróć odpowiedź `200`, `400` lub `500`.
5.  **Testowanie**: Przygotuj testy dla serwisu i punktu końcowego.
