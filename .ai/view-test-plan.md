# Test Plan: GET /api/v1/sets/{setId}

Ten dokument opisuje strategię testowania dla punktu końcowego API `GET /api/v1/sets/{setId}`, który pobiera szczegóły zestawu fiszek.

## 1. Zakres Testów

Testy zostaną podzielone na dwie główne kategorie:

1.  **Testy Jednostkowe**: Skupione na weryfikacji logiki biznesowej w izolacji, głównie w `flashcardSetService.ts`. Będziemy mockować zależności, takie jak klient Supabase, aby testować funkcje w kontrolowanym środowisku.
2.  **Testy Integracyjne/API**: Skupione na weryfikacji całego przepływu żądania, od otrzymania żądania HTTP do zwrócenia odpowiedzi. Te testy będą sprawdzać interakcję między punktem końcowym Astro, middleware, serwisem a (potencjalnie) testową bazą danych.

## 2. Scenariusze Testowe

### 2.1. Testy Jednostkowe (`flashcardSetService.ts`)

**Cel**: Weryfikacja funkcji `getFlashcardSetById`.

| Opis Testu | Oczekiwany Rezultat |
| :--- | :--- |
| **1. Pomyślne pobranie zestawu** | Funkcja zwraca obiekt `FlashcardSetDetailDto` z poprawnymi danymi zestawu i listą fiszek. |
| **2. Zestaw nie istnieje** | Funkcja zwraca `null`. |
| **3. Zestaw jest usunięty (soft-delete)**| Funkcja zwraca `null` (mockowane zapytanie powinno uwzględniać `deleted_at IS NULL`). |
| **4. Pusta lista fiszek** | Funkcja zwraca `FlashcardSetDetailDto` z `flashcards: []`. |
| **5. Niektóre fiszki są usunięte** | Wynikowa lista fiszek zawiera tylko te, które nie mają ustawionego `deleted_at`. |
| **6. Błąd zapytania do bazy danych** | Funkcja rzuca wyjątek, który zostanie przechwycony przez warstwę API. |

### 2.2. Testy Integracyjne (API Endpoint)

**Cel**: Weryfikacja działania punktu końcowego `GET /src/pages/api/v1/sets/[setId].ts`.

#### Scenariusze Pomyślne

| Opis Testu | Metoda | Status Code | Oczekiwany Rezultat w Odpowiedzi |
| :--- | :--- | :--- | :--- |
| **1. Użytkownik pobiera własny zestaw** | `GET` | `200 OK` | Zwraca pełny obiekt `FlashcardSetDetailDto` z danymi zestawu i listą fiszek. |
| **2. Zestaw istnieje, ale nie ma fiszek** | `GET` | `200 OK` | Zwraca obiekt `FlashcardSetDetailDto` z `flashcards: []`. |

#### Scenariusze Błędów

| Opis Testu | Metoda | Status Code | Oczekiwany Rezultat w Odpowiedzi |
| :--- | :--- | :--- | :--- |
| **1. Brak uwierzytelnienia** | `GET` | `401 Unauthorized` | Komunikat o braku autoryzacji. |
| **2. Nieprawidłowy format `setId`** | `GET` | `400 Bad Request` | Komunikat błędu walidacji Zod, np. `{ "error": "Invalid UUID" }`. |
| **3. Zestaw o podanym `setId` nie istnieje** | `GET` | `404 Not Found` | Komunikat, np. `{ "error": "Flashcard set not found" }`. |
| **4. Użytkownik próbuje pobrać cudzy zestaw**| `GET` | `404 Not Found` | Taki sam komunikat jak wyżej (dzięki RLS). |
| **5. Zestaw jest usunięty (soft-delete)** | `GET` | `404 Not Found` | Taki sam komunikat jak wyżej (dzięki filtrowaniu `deleted_at`). |
| **6. Błąd serwera (np. błąd bazy danych)** | `GET` | `500 Internal Server Error` | Ogólny komunikat o błędzie serwera. Weryfikacja, czy błąd został zalogowany. |

## 3. Środowisko i Narzędzia Testowe

-   **Framework do testów**: Vitest
-   **Mockowanie**: `vi.mock` dla zależności, np. klienta Supabase w testach jednostkowych.
-   **Asersje**: Biblioteka asercji wbudowana w Vitest (`expect`).
-   **Testy API**: Wykorzystanie `fetch` lub dedykowanej biblioteki (np. `supertest`) do wysyłania żądań do serwera deweloperskiego Astro.
-   **Baza danych**: W testach integracyjnych można użyć testowej bazy danych Supabase lub mockować odpowiedzi na poziomie klienta SDK.

## 4. Przygotowanie Danych Testowych (Test Fixtures)

-   **Użytkownik A**: Posiada zestaw A1 (z fiszkami A1F1, A1F2) i zestaw A2 (bez fiszek).
-   **Użytkownik B**: Posiada zestaw B1.
-   **Zestaw C1**: Należy do użytkownika A, ale jest oznaczony jako usunięty (`deleted_at` ma wartość).
-   **Fiszka A1F3**: Należy do zestawu A1, ale jest oznaczona jako usunięta.
-   **Tokeny JWT**: Wygenerowane tokeny dla Użytkownika A i Użytkownika B.
