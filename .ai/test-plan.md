# Plan testów – Fiszki AI

## 1. Wprowadzenie i cele testowania
Celem testów jest potwierdzenie, że aplikacja Fiszki AI spełnia wymagania PRD: generowanie fiszek (manualnie i przez AI), zarządzanie zestawami oraz naukę według spaced repetition przy zachowaniu bezpieczeństwa kont użytkowników. Testy mają wcześnie wykrywać regresje w UI Astro/React, w supabase’owych API oraz w integracji z usługami AI.

## 2. Zakres testów
- Frontend (Astro + React + Tailwind + shadcn/ui): widoki `/login`, `/register`, `/generate`, `/sets`, `/sets/:id`, `/learn`, `/generate-ai`, `/generate-ai/preview`.
- Backend API (Astro API routes + Supabase): logowanie, zestawy, fiszki, AI proxy, learning session.
- Integracje: Supabase auth/RLS, RPC `create_set_with_flashcards`, zewnętrzne API LLM (stubowane w testach).

Poza zakresem: pełne testy wydajności produkcyjnej, testy E2E z prawdziwą usługą email/SMTP oraz manualne testy mobile.

## 3. Typy testów
- **Testy jednostkowe (Vitest)**: czysta logika (`sm2`, helpery learningService, walidacje formularzy).
- **Testy helperów HTTP/React (Vitest + mock `fetch`)**: funkcje `fetchFlashcardSets`, `fetchLearningSessionCards`, `submitReviewRequest`.
- **Testy dostępności/manualne smoke**: upewnienie się, że kluczowe ścieżki mają etykiety i focus states (wg frontend guidelines).

## 4. Scenariusze testowe kluczowych funkcjonalności
1. **Autoryzacja**
   - Rejestracja i logowanie z poprawnymi/niepoprawnymi danymi.
   - Walidacja przekierowań po wylogowaniu (token w sessionStorage).
2. **Zarządzanie zestawami**
   - `GET/POST /api/v1/sets`, paginacja i sortowanie, RLS.
   - Widok `/sets` – filtrowanie, zmiana pageSize, przejście do `/sets/:id`.
   - Widok `/sets/:id` – edycja i usuwanie fiszek, obsługa błędów.
3. **Generator manualny**
   - Dodanie/edycja/usunięcie fiszki, walidacja pustych pól.
4. **Generator AI**
   - `POST /api/v1/ai/generate` z poprawnym payloadem i błędami (np. brak JSON od LLM).
   - `POST /api/v1/ai/accept` – zapis zestawu i odświeżenie listy.
5. **Learning flow – plan szczegółowy**
   1. **Warstwa usług**
      - `sm2` – testy jednostkowe wszystkich wariantów `quality` (0‑5); upewnić się, że EF ≥ 1.3 oraz poprawność `interval`.
      - `learningService.getReviewSession` – zwraca tylko karty z `next_review_date <= now`; fallback do flashcards gdy brak harmonogramu; filtr `setId`.
   2. **Helpery HTTP `/learn`**
      - `fetchFlashcardSets` – sukces i błąd HTTP.
      - `fetchLearningSessionCards` – poprawne mapowanie payloadu + propagacja błędów.
      - `submitReviewRequest` – błąd serwera → wyjątek, sukces → zwrot JSON.
   3. **UI `/learn`**
      - Start sesji: disabled CTA gdy brak zestawów/tokenu; walidacja limitu 1‑100.
      - Sterowanie: odsłonięcie odpowiedzi (klik/Space), ocena kart (0‑5 + skróty), blokada przy braku odsłonięcia, obsługa błędów mutacji (toasty).
      - Postęp: progress bar, reset sesji, podsumowanie po zakończeniu (czas, liczba kart).
      - Edge cases: brak fiszek (toast), utrata tokenu (redirect), wielokrotne szybkie kliknięcia ratingów.
6. **Reset hasła (po wdrożeniu)** – link Supabase, formularz `/reset-password`.

## 5. Środowisko testowe
- Node.js 20 + pnpm/npm zgodnie z repo.
- Vitest + jsdom dla testów UI; `@testing-library/react` do renderów.
- Supabase test project lub lokalny supabase docker (migracje z folderu `supabase/migrations`).
- Pliki `.env` testowe z mockowymi kluczami (np. `OPENROUTER_API_KEY=stub`).

## 6. Narzędzia do testowania
- **Vitest** (jednostkowe/integracyjne) – runner, coverage.
- **React Testing Library** – interakcje komponentów.
- **MSW / fetch-mock** – stuby zewnętrznych API i Supabase.
- **ESLint + Biome/Tailwind IntelliSense** – statyczna analiza.
- **Supabase CLI** – reset/seed DB do testów API.

## 7. Harmonogram testów
1. **Tydzień 1**: testy jednostkowe hooków/Auth/AI context; API tests dla `/api/v1/sets`.
2. **Tydzień 2**: scenariusze `/generate`, `/sets`, `/sets/:id`.
3. **Tydzień 3**: learning flow + AI endpoints; smoke test dostępności.
4. **Przed wydaniem**: regresja (uruchomienie wszystkich testów Vitest + manualny smoke UI).

## 8. Kryteria akceptacji
- 100% testów Vitest przechodzi w CI (GitHub Actions).
- Pokrycie krytycznych modułów (auth, sets, learning, AI) ≥ 80%.
- Brak blockerów w zgłoszonych defektach; otwarte tylko niskie priorytety ze zgodą właściciela produktu.

## 9. Role i odpowiedzialności
- **QA/Dev**: pisanie i utrzymanie testów Vitest, przygotowanie mocków Supabase.
- **Tech Lead**: zatwierdzenie zakresu testów, review pull requestów.
- **Product Owner**: akceptacja kryteriów i decyzje o ryzykach.

## 10. Procedury raportowania błędów
- Defekty rejestrowane w Jira/Linear z:
  - numerem commit/branch, ścieżką testu, krokami odtworzenia, logami (stack trace, response).
- Priorytet ustalany wg wpływu na wymagania PRD (P0: brak dostępu do nauki/generatorów; P1: błędy UI bez utraty danych; P2: drobne UI).
- Retesty po naprawie uruchamiane w tej samej gałęzi CI przed scaleniem.


