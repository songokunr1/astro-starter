# API Endpoint Implementation Plan: POST /api/v1/ai/generate-flashcards

## 1. Przegląd punktu końcowego
Ten punkt końcowy przyjmuje od użytkownika fragment tekstu i nazwę zestawu, a następnie, korzystając z zewnętrznego dostawcy AI (np. OpenRouter.ai), generuje na tej podstawie zestaw fiszek. Endpoint nie zapisuje fiszek w bazie danych, lecz zwraca je w odpowiedzi jako "podgląd" do akceptacji przez użytkownika.

## 2. Szczegóły żądania
- **Metoda HTTP**: `POST`
- **Struktura URL**: `/api/v1/ai/generate-flashcards`
- **Parametry**: Brak.
- **Request Body**:
  ```json
  {
    "source_text": "string (required)",
    "setName": "string (required)"
  }
  ```

## 3. Wykorzystywane typy
- **DTOs**:
  - `GenerateFlashcardsResponseDto`: Odpowiedź zawierająca tymczasowy identyfikator, nazwę, tekst źródłowy i listę wygenerowanych fiszek.
- **Command Modele**:
  - `GenerateFlashcardsCommand`: Reprezentuje dane wejściowe.
- **Walidacja**:
  - Schemat Zod dla `GenerateFlashcardsCommand`.

## 4. Szczegóły odpowiedzi
- **Sukces (`200 OK`)**: Zwraca obiekt `GenerateFlashcardsResponseDto`.
  ```json
  {
    "temp_id": "string", // Wygenerowany UUID
    "setName": "string",
    "source_text": "string",
    "flashcards": [
      { "front": "string", "back": "string" }
    ]
  }
  ```
- **Błędy**:
  - `400 Bad Request`: Nieprawidłowe dane wejściowe.
  - `401 Unauthorized`: Użytkownik nie jest zalogowany.
  - `429 Too Many Requests`: Przekroczono limit zapytań.
  - `500 Internal Server Error`: Błąd po stronie usługi AI lub serwera.

## 5. Przepływ danych
1.  Żądanie `POST` trafia do punktu końcowego (`/src/pages/api/v1/ai/generate-flashcards.ts`).
2.  Middleware Astro weryfikuje token JWT.
3.  Punkt końcowy waliduje ciało żądania (`source_text` i `setName` są wymagane).
4.  Wywoływana jest funkcja `generateFlashcardsFromText` z nowego serwisu `src/lib/services/aiService.ts`.
5.  Serwis konstruuje odpowiedni prompt dla modelu AI, zawierający tekst źródłowy i instrukcje dotyczące formatu wyjściowego (np. JSON z tablicą obiektów `{front, back}`).
6.  Serwis wysyła zapytanie do zewnętrznego API (OpenRouter.ai) używając klucza API przechowywanego w zmiennych środowiskowych.
7.  Po otrzymaniu odpowiedzi, serwis parsuje ją, aby wyodrębnić listę fiszek. W przypadku błędu parsowania, zwraca błąd wewnętrzny.
8.  Serwis generuje losowy `temp_id` (np. `crypto.randomUUID()`) i konstruuje obiekt `GenerateFlashcardsResponseDto`.
9.  Punkt końcowy zwraca odpowiedź `200 OK` z danymi.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie**: Weryfikacja tokenu JWT w middleware.
- **Ochrona klucza API**: Klucz do usługi AI musi być przechowywany jako zmienna środowiskowa po stronie serwera (`OPENROUTER_API_KEY`) i nigdy nie może być ujawniony po stronie klienta.
- **Rate Limiting**: Ten endpoint jest kosztowny obliczeniowo i finansowo. Należy bezwzględnie wdrożyć mechanizm ograniczania liczby żądań na użytkownika (np. 10 żądań na minutę), aby zapobiec nadużyciom.
- **Prompt Injection**: Należy być świadomym ryzyka, że złośliwie spreparowany `source_text` może próbować manipulować zachowaniem modelu AI. Na obecnym etapie podstawowa walidacja długości tekstu jest wystarczająca.

## 7. Obsługa błędów
- **Nieprawidłowe dane (`400 Bad Request`)**: Obsługiwane przez walidację Zod.
- **Brak uwierzytelnienia (`401 Unauthorized`)**: Obsługiwane przez middleware.
- **Błąd usługi AI (`500 Internal Server Error`)**: Jeśli API zewnętrzne zwróci błąd, odpowiedź będzie nieprawidłowa lub wystąpi timeout. Błąd należy zarejestrować w `system_logs` z typem `AI_GENERATION_ERROR`.
- **Przekroczenie limitu zapytań (`429 Too Many Requests`)**: Obsługiwane przez mechanizm rate limiting.

## 8. Rozważania dotyczące wydajności
- Głównym czynnikiem wpływającym na wydajność jest czas odpowiedzi zewnętrznej usługi AI. Endpoint z natury będzie wolny.
- Frontend musi obsługiwać ten proces asynchronicznie, informując użytkownika o trwającym generowaniu (np. za pomocą spinnera).

## 9. Etapy wdrożenia
1.  **Utworzenie serwisu**: Stwórz plik `src/lib/services/aiService.ts`.
2.  **Implementacja logiki serwisu**: Dodaj funkcję `generateFlashcardsFromText(command: GenerateFlashcardsCommand): Promise<{ data: GenerateFlashcardsResponseDto | null; error: string | null }>`. Funkcja ta będzie odpowiedzialna za komunikację z OpenRouter.
3.  **Dodanie zmiennej środowiskowej**: Dodaj `OPENROUTER_API_KEY` do pliku `.env`.
4.  **Utworzenie pliku punktu końcowego**: Stwórz plik `src/pages/api/v1/ai/generate-flashcards.ts`.
5.  **Implementacja handlera `POST`**: Zaimplementuj walidację, wywołanie serwisu, obsługę błędów i zwracanie odpowiedzi.
6.  **Implementacja Rate Limiting**: Rozważ użycie gotowej biblioteki do implementacji mechanizmu w middleware Astro lub na poziomie samego endpointu.
7.  **Testowanie**: Przygotuj testy (mogą być mockowane dla usługi zewnętrznej) weryfikujące poprawność generowania, obsługę błędów AI i walidację danych.



