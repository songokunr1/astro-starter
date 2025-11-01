# API Endpoint Implementation Plan: POST /api/v1/learning/review

## 1. Przegląd punktu końcowego
Ten punkt końcowy służy do przesyłania przez użytkownika wyniku powtórki pojedynczej fiszki. Na podstawie oceny jakości (`quality`), backend aktualizuje harmonogram powtórek dla tej fiszki, korzystając z logiki algorytmu SM-2.

## 2. Szczegóły żądania
- **Metoda HTTP**: `POST`
- **Struktura URL**: `/api/v1/learning/review`
- **Parametry**: Brak.
- **Request Body**:
  ```json
  {
    "flashcard_id": "uuid (required)",
    "quality": "integer (required, 0-5)"
  }
  ```

## 3. Wykorzystywane typy
- **DTOs**:
  - `SubmitReviewResponseDto`: Odpowiedź zawierająca zaktualizowane dane harmonogramu.
- **Command Modele**:
  - `SubmitReviewCommand`: Reprezentuje dane wejściowe.
- **Walidacja**:
  - Schemat Zod dla `SubmitReviewCommand`.

## 4. Szczegóły odpowiedzi
- **Sukces (`200 OK`)**: Zwraca obiekt `SubmitReviewResponseDto`.
  ```json
  {
    "flashcard_id": "uuid",
    "next_review_date": "string<date-time>",
    "interval": "integer",
    "repetitions": "integer",
    "ease_factor": "number"
  }
  ```
- **Błędy**:
  - `400 Bad Request`: Nieprawidłowe dane wejściowe.
  - `401 Unauthorized`: Użytkownik nie jest zalogowany.
  - `404 Not Found`: Fiszka lub jej harmonogram nie istnieją dla tego użytkownika.
  - `500 Internal Server Error`: Wystąpił błąd serwera.

## 5. Przepływ danych
1.  Żądanie `POST` trafia do punktu końcowego (`/src/pages/api/v1/learning/review.ts`).
2.  Middleware Astro weryfikuje token JWT.
3.  Punkt końcowy waliduje ciało żądania za pomocą Zod.
4.  Wywoływana jest funkcja `submitReview` z serwisu `src/lib/services/learningService.ts`.
5.  Serwis najpierw pobiera istniejący wpis z `learning_schedules` dla danego `flashcard_id` i `user_id`. Jeśli wpis nie istnieje, może to oznaczać pierwszą powtórkę – wtedy używane są wartości domyślne. Serwis musi też potwierdzić, że fiszka należy do użytkownika.
6.  Serwis przekazuje `quality` oraz dane z `learning_schedules` (stare `interval`, `repetitions`, `ease_factor`) do funkcji pomocniczej implementującej algorytm SM-2.
7.  Funkcja SM-2 zwraca nowe wartości: `interval`, `repetitions`, `ease_factor`. Na podstawie nowego interwału obliczana jest nowa data `next_review_date`.
8.  Serwis wykonuje `update` na tabeli `learning_schedules`, zapisując nowe wartości.
9.  Serwis wykonuje `insert` do tabeli `learning_sessions`, aby zarejestrować to zdarzenie.
10. Serwis zwraca zaktualizowane dane harmonogramu jako `SubmitReviewResponseDto`.
11. Punkt końcowy zwraca odpowiedź `200 OK`.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie**: Weryfikacja tokenu JWT.
- **Autoryzacja**: Kluczowe jest, aby operacje (pobranie i aktualizacja harmonogramu) były ściśle powiązane z `user_id` zalogowanego użytkownika. Polityki RLS stanowią dodatkową ochronę.

## 7. Obsługa błędów
- **Nieprawidłowe dane (`400 Bad Request`)**: Obsługiwane przez walidację Zod.
- **Brak uwierzytelnienia (`401 Unauthorized`)**: Obsługiwane przez middleware.
- **Nie znaleziono zasobu (`404 Not Found`)**: Jeśli fiszka, dla której przesyłana jest recenzja, nie istnieje lub nie należy do użytkownika.
- **Błąd serwera (`500 Internal Server Error`)**: W przypadku problemów z bazą danych.

## 8. Rozważania dotyczące wydajności
- Operacje na bazie danych (SELECT, UPDATE, INSERT) są wykonywane na kluczach głównych lub unikalnych, co zapewnia wysoką wydajność.
- Obliczenia algorytmu SM-2 są trywialne pod względem wydajności.

## 9. Etapy wdrożenia
1.  **Utworzenie funkcji pomocniczej**: W `src/lib/sm2.ts` (nowy plik) zaimplementuj logikę algorytmu SM-2 jako czystą funkcję.
2.  **Aktualizacja serwisu**: W `src/lib/services/learningService.ts` dodaj funkcję `submitReview(supabase: SupabaseClient, userId: string, command: SubmitReviewCommand): Promise<{ data: SubmitReviewResponseDto | null; error: any }>`.
3.  **Utworzenie pliku punktu końcowego**: Stwórz plik `src/pages/api/v1/learning/review.ts`.
4.  **Implementacja handlera `POST`**: Zaimplementuj walidację, wywołanie serwisu, obsługę błędów i zwracanie odpowiedzi.
5.  **Testowanie**: Przygotuj testy jednostkowe dla algorytmu SM-2 oraz testy integracyjne dla całego przepływu, uwzględniając różne wartości `quality` i kolejne powtórki.



