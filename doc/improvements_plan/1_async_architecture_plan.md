# Plan Ulepszeń: Asynchroniczne Generowanie Fiszek

## 1. Obecny Problem

Obecny przepływ generowania fiszek cierpi na dwa krytyczne problemy, które powodują niestabilność i błędy:

1.  **Timeout Serwera (Główna Przyczyna):** Punkt końcowy `POST /api/v1/ai/generate-flashcards` synchronicznie czeka na odpowiedź od usługi AI (OpenRouter). Operacje AI mogą trwać bardzo długo (zaobserwowano czasy powyżej 120 sekund). Przekracza to limit czasu odpowiedzi (timeout) serwera deweloperskiego Astro, co powoduje, że serwer przerywa połączenie i zwraca błąd `500 Internal Server Error`, a nawet może doprowadzić do awarii lub restartu całego serwera.

2.  **Niestabilność Usługi AI:** Darmowy model AI (`openai/gpt-oss-20b:free`) okazał się zawodny, często zwracając puste odpowiedzi. Powoduje to błędy w logice aplikacji, nawet jeśli początkowe żądanie do usługi AI nie zakończy się błędem timeout.

W rezultacie otrzymujemy zawodny proces, który jest niemożliwy do spójnego przetestowania od początku do końca.

## 2. Proponowane Rozwiązanie: Architektura Asynchroniczna

Aby rozwiązać te fundamentalne problemy, konieczna jest migracja do architektury asynchronicznej, co jest standardowym podejściem w branży do obsługi długotrwałych zadań.

Nowy przepływ będzie działał następująco:

1.  Klient wysyła żądanie do `POST /api/v1/ai/generate-flashcards`.
2.  Serwer **nie czeka** na ukończenie zadania przez AI. Zamiast tego tworzy "zadanie" (job) z unikalnym identyfikatorem (`jobId`), umieszcza je w kolejce (na razie w prostym cache'u w pamięci) i **natychmiast** odpowiada statusem `202 Accepted` wraz z `jobId`.
3.  Klient, po otrzymaniu `jobId`, zaczyna cyklicznie odpytywać nowy punkt końcowy (`GET /api/v1/ai/generation-status/[jobId]`), np. co 2-3 sekundy.
4.  W międzyczasie na serwerze zadanie generowania AI wykonuje się w tle. Po zakończeniu aktualizuje status zadania w cache'u, zapisując wynik (wygenerowane fiszki) lub komunikat o błędzie.
5.  Gdy klient odpyta punkt końcowy statusu, a zadanie jest już ukończone, serwer zwróci odpowiedź `200 OK` z danymi fiszek. Jeśli zadanie wciąż jest w toku, zwróci `202 Accepted`. Jeśli się nie powiodło, zwróci `500 Internal Server Error`.
6.  Gdy klient w końcu otrzyma dane fiszek, może kontynuować proces, wysyłając je do punktu końcowego `POST /api/v1/ai/accept-flashcards`.

## 3. Szczegółowe Kroki Implementacji

### Krok 1: Stworzenie Cache'u dla Zadań w Pamięci

-   **Plik:** `src/lib/job-cache.ts`
-   **Działanie:** Implementacja prostej mapy JavaScript (`Map`), która będzie działać jako cache w pamięci. Będzie przechowywać status (`processing`, `completed`, `failed`), wynik i znacznik czasu dla każdego zadania.
-   **Uwaga:** W środowisku produkcyjnym to rozwiązanie powinno zostać zastąpione czymś bardziej solidnym, jak Redis.

### Krok 2: Wzmocnienie Usługi AI (`aiService.ts`)

-   **Działanie 1: Implementacja Logiki Ponawiania Prób (Retry):** Stworzenie funkcji `fetchWithRetry`, która będzie opakowywać wywołanie `fetch` do API OpenRouter. Funkcja ta ponowi żądanie (np. 3 razy z wykładniczym opóźnieniem), jeśli odpowiedź będzie pusta lub wystąpi przejściowy błąd serwera (5xx).
-   **Działanie 2: Zmiana na Bardziej Niezawodny Model AI:** Zmiana modelu z `openai/gpt-oss-20b:free` na `openai/gpt-3.5-turbo`, aby poprawić niezawodność.
-   **Działanie 3: Stworzenie Funkcji do Pracy w Tle:** Stworzenie nowej, eksportowanej funkcji `startFlashcardGenerationJob(jobId, command)`, która będzie odpowiedzialna za uruchomienie całego procesu generowania w tle i aktualizację cache'u po jego zakończeniu.

### Krok 3: Modyfikacja Punktu Końcowego `generate-flashcards`

-   **Plik:** `src/pages/api/v1/ai/generate-flashcards.ts`
-   **Działanie:** Przebudowa handlera `POST`:
    1.  Walidacja żądania i użytkownika jak dotychczas.
    2.  Wygenerowanie unikalnego `jobId` (np. `crypto.randomUUID()`).
    3.  Dodanie zadania do cache'u ze statusem `processing`.
    4.  Wywołanie `startFlashcardGenerationJob(jobId, command)` **bez** `await`.
    5.  Natychmiastowe zwrócenie odpowiedzi `202 Accepted` z `jobId` w ciele JSON.

### Krok 4: Stworzenie Nowego Punktu Końcowego `generation-status`

-   **Plik:** `src/pages/api/v1/ai/generation-status/[jobId].ts`
-   **Działanie:** Implementacja handlera `GET`:
    1.  Pobranie `jobId` z parametru URL.
    2.  Wyszukanie zadania w cache'u (`job-cache.ts`).
    3.  Jeśli nie znaleziono, zwrot `404 Not Found`.
    4.  Jeśli status to `processing`, zwrot `202 Accepted` z komunikatem.
    5.  Jeśli status to `completed`, zwrot `200 OK` z danymi fiszek (`job.data`).
    6.  Jeśli status to `failed`, zwrot `500 Internal Server Error` z komunikatem błędu (`job.error`).

### Krok 5: Aktualizacja Skryptu Testowego (PowerShell)

-   **Działanie:** Modyfikacja skryptu tak, aby obsługiwał nowy, asynchroniczny przepływ:
    1.  Wywołanie `generate-flashcards` i zapisanie `jobId`.
    2.  Wejście w pętlę, która odpytuje punkt końcowy `generation-status/[jobId]` co kilka sekund.
    3.  Wyjście z pętli, gdy status odpowiedzi przestanie być `202`.
    4.  Jeśli ostateczna odpowiedź to `200`, użycie danych do wywołania `accept-flashcards`.
    5.  Jeśli wystąpił błąd, wyświetlenie komunikatu i zakończenie pracy.
