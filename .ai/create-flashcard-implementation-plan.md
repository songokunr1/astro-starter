# API Endpoint Implementation Plan: POST /api/v1/sets/{setId}/flashcards

## 1. Przegląd punktu końcowego
Ten punkt końcowy umożliwia uwierzytelnionemu użytkownikowi ręczne dodanie nowej fiszki do istniejącego zestawu.

## 2. Szczegóły żądania
- **Metoda HTTP**: `POST`
- **Struktura URL**: `/api/v1/sets/{setId}/flashcards`
- **Parametry**:
  - **Wymagane**:
    - `setId` (parametr ścieżki): UUID zestawu, do którego zostanie dodana fiszka.
- **Request Body**:
  ```json
  {
    "front": "string (required, max: 200 chars)",
    "back": "string (required, max: 200 chars)",
    "media_url": "string (optional)"
  }
  ```

## 3. Wykorzystywane typy
- **DTOs**:
  - `FlashcardDto`: Zwracany jako odpowiedź po pomyślnym utworzeniu fiszki.
- **Command Modele**:
  - `CreateFlashcardCommand`: Reprezentuje dane wejściowe do utworzenia fiszki.
- **Walidacja**:
  - Schemat Zod dla `setId` (musi być UUID).
  - Schemat Zod dla `CreateFlashcardCommand` (z walidacją długości `front` i `back`).

## 4. Szczegóły odpowiedzi
- **Sukces (`201 Created`)**: Zwraca nowo utworzony obiekt `FlashcardDto`.
  ```json
  {
    "id": "uuid",
    "front": "string",
    "back": "string",
    "media_url": "string | null",
    "created_at": "string<date-time>",
    "updated_at": "string<date-time>"
  }
  ```
- **Błędy**:
  - `400 Bad Request`: Nieprawidłowe dane wejściowe lub `setId`.
  - `401 Unauthorized`: Użytkownik nie jest zalogowany.
  - `404 Not Found`: Zestaw o podanym `setId` nie istnieje lub nie należy do użytkownika.
  - `500 Internal Server Error`: Wystąpił błąd serwera.

## 5. Przepływ danych
1.  Żądanie `POST` trafia do punktu końcowego Astro (`/src/pages/api/v1/sets/[setId]/flashcards.ts`).
2.  Middleware Astro weryfikuje token JWT.
3.  Punkt końcowy waliduje `setId` oraz ciało żądania za pomocą Zod.
4.  Wywoływana jest funkcja `createFlashcard` z serwisu `src/lib/services/flashcardService.ts`.
5.  Serwis najpierw sprawdza, czy zestaw o podanym `setId` istnieje i należy do użytkownika (robiąc prosty `select` na `flashcard_sets`). Jeśli nie, zwraca błąd, który zostanie zmapowany na `404`.
6.  Jeśli zestaw istnieje, serwis wykonuje operację `insert()` w tabeli `flashcards`, dodając `flashcard_set_id: setId` do danych z `CreateFlashcardCommand`.
7.  Operacja `insert` jest połączona z `.select().single()`, aby atomowo zwrócić nowo utworzoną fiszkę.
8.  Punkt końcowy otrzymuje `FlashcardDto` i zwraca go w odpowiedzi `201 Created`.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie**: Weryfikacja tokenu JWT w middleware.
- **Autoryzacja**: Kluczowe jest sprawdzenie w serwisie, czy użytkownik jest właścicielem zestawu (`setId`), do którego próbuje dodać fiszkę. Zapobiega to dodawaniu fiszek do cudzych zestawów. Polityka RLS dla `INSERT` na `flashcards` powinna również to weryfikować jako dodatkowe zabezpieczenie.
- **Walidacja danych wejściowych**: Rygorystyczna walidacja Zod dla `front`, `back` (max 200 znaków) i `media_url` (jako URL) jest niezbędna.

## 7. Obsługa błędów
- **Nieprawidłowe dane (`400 Bad Request`)**: Obsługiwane przez walidację Zod.
- **Brak uwierzytelnienia (`401 Unauthorized`)**: Obsługiwane przez middleware.
- **Zestaw nie istnieje (`404 Not Found`)**: Gdy wstępne sprawdzenie w serwisie nie znajdzie zestawu należącego do użytkownika.
- **Błąd serwera (`500 Internal Server Error`)**: W przypadku błędu operacji `insert`. Błąd powinien być zarejestrowany.

## 8. Rozważania dotyczące wydajności
- Dodatkowe zapytanie sprawdzające własność zestawu generuje niewielki narzut, ale jest konieczne dla bezpieczeństwa i poprawnej obsługi błędów `404`. Operacje `SELECT` i `INSERT` na kluczach głównych/indeksowanych są wydajne.

## 9. Etapy wdrożenia
1.  **Utworzenie serwisu**: Stwórz plik `src/lib/services/flashcardService.ts`.
2.  **Implementacja logiki serwisu**: Dodaj funkcję `createFlashcard(supabase: SupabaseClient, userId: string, setId: string, command: CreateFlashcardCommand): Promise<{ data: FlashcardDto | null; error: { status: number; message: string } | null }>`.
3.  **Utworzenie pliku punktu końcowego**: Stwórz plik `src/pages/api/v1/sets/[setId]/flashcards.ts`.
4.  **Implementacja handlera `POST`**:
    - Zdefiniuj i użyj schematów Zod do walidacji.
    - Pobierz `user` z `locals`.
    - Wywołaj `flashcardService.createFlashcard`.
    - Zmapuj błędy z serwisu (np. `404`, `500`) na odpowiednie odpowiedzi HTTP.
    - W razie sukcesu zwróć `201` z nową fiszką.
5.  **Testowanie**: Dodaj testy dla serwisu i punktu końcowego, weryfikując pomyślne tworzenie, błędy walidacji, próbę dodania do cudzego zestawu i brak autoryzacji.



