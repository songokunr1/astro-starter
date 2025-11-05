# Plan implementacji: Logowanie, Ręczne Tworzenie Fiszek i Przygotowanie pod Generator AI

## 1. Przegląd

Dotychczas wdrożyliśmy podstawowe elementy aplikacji: bezpieczne logowanie oraz pełnoprawny widok `/generate` z ręcznym tworzeniem, edycją i usuwaniem fiszek. Kolejnym krokiem będzie dodanie dedykowanego przepływu AI (`/generate-ai`), który wykorzysta istniejące wzorce (AuthContext, React Query, Shadcn/ui) i rozszerzy je o obsługę zewnętrznego modelu językowego.

Plan dzieli się na trzy zakończone etapy oraz czwarty – planowany – obejmujący generator AI.

---

## Etap 1: Logowanie i przygotowanie infrastruktury (zakończony)

### 2. Routing
- `/login` – formularz logowania oparty o Supabase Auth.
- `/generate` – docelowa strona generatora (początkowo placeholder, docelowo manualny formularz).

### 3. Kluczowe komponenty
```
src/pages/login.astro
  └─ Layout
      └─ LoginPage (`client:load`)
          └─ LoginForm (React, shadcn/ui, react-hook-form, zod)

src/pages/generate.astro
  └─ Layout
      └─ GeneratePlaceholderPage (React – obecnie ManualFlashcardForm)
```

### 4. Logika
- `AuthContext` przechowuje token JWT w pamięci i `sessionStorage`.
- `LoginForm` waliduje dane, wysyła żądanie do Supabase, zapisuje token i pokazuje toasty o sukcesie/błędach.
- Po zalogowaniu następuje przekierowanie na `/generate`.

### 5. Testy
- Walidacja formularza (puste pola, błędny email/hasło, kod 401/429).
- Sprawdzenie utrzymania tokenu po odświeżeniu strony.

---

## Etap 2: Manualny generator fiszek (zakończony)

### 6. Zakres funkcjonalny
- Pobieranie zestawów (`GET /api/v1/sets`).
- Tworzenie nowego zestawu (formularz rozwijany, `POST /api/v1/sets`).
- Dodawanie fiszek (`POST /api/v1/sets/{setId}/flashcards`).
- Wyświetlanie listy fiszek w wybranym secie.
- Edycja inline (`PATCH /api/v1/sets/{setId}/flashcards/{flashcardId}`).
- Usuwanie (`DELETE /api/v1/sets/{setId}/flashcards/{flashcardId}`).
- Toastery potwierdzające akcje i obsługujące błędy.

### 7. Struktura komponentu `ManualFlashcardForm`
```
ManualFlashcardForm
  ├─ Select zestawu + przycisk „New set”
  ├─ (Warunkowo) formularz tworzenia nowego zestawu
  ├─ Formularz dodawania fiszki (front/back)
  └─ Lista fiszek (kart) z przyciskami Edit/Save/Cancel/Delete
```

### 8. UX
- Sekcja „Create new set” widoczna tylko po wyborze „New set”.
- Po utworzeniu zestawu sekcja się chowa, a nowy zestaw staje się aktywny.
- Tryb edycji blokuje równoczesne zapisywanie/usuń; toasty informują o powodzeniu lub błędach.
- Usuwanie wymaga potwierdzenia (`window.confirm`).

### 9. Pokrycie API
- `GET /api/v1/sets` – listing z paginacją.
- `POST /api/v1/sets` – tworzenie zestawu.
- `GET /api/v1/sets/{setId}` – szczegóły zestawu (z fiszkami).
- `POST /api/v1/sets/{setId}/flashcards` – dodawanie fiszki.
- `PATCH /api/v1/sets/{setId}/flashcards/{flashcardId}` – edycja.
- `DELETE /api/v1/sets/{setId}/flashcards/{flashcardId}` – usuwanie.

---

## Etap 3: Usprawnienia UX i testy (bieżące zadania)

1. Ujednolicenie obsługi błędów (blokady przycisków, dedykowane komunikaty dla 401/429/500).
2. Checklisty manualne i ewentualne testy E2E dla przepływu logowanie → dodaj/edytuj/usuń fiszkę.
3. Dalsze kosmetyczne poprawki UI (stany pustych danych, responsywność, skróty klawiaturowe w edycji).

---

## Etap 4: Generator AI – plan wdrożenia

### 10. Zakres
- Nowe widoki: `/generate-ai` (formularz) oraz `/generate-ai/preview` (podgląd i akceptacja).
- Kontekst `AiGenerationContext` do przechowywania tymczasowego wyniku LLM.
- Integracja z endpointem proxy do zewnętrznego modelu (`POST /api/v1/ai/generate` + `POST /api/v1/ai/accept`).

### 11. Struktura komponentów
```
src/pages/generate-ai.astro
  └─ Layout
      └─ AiGeneratorForm (`client:load`)
          ├─ Form na parametry (setName, source_text, opcje)
          └─ Sekcja statusu (loader, logi, błędy)

src/pages/generate-ai/preview.astro
  └─ Layout
      └─ AiGeneratorPreview (`client:load`)
          ├─ Lista edytowalnych fiszek (na bazie ManualFlashcardCard)
          ├─ Akcje „Save as set” / „Discard”
          └─ Toasty + redirecty
```

### 12. Integracja API (szczegóły w `api-plan.md`)
- `POST /api/v1/ai/generate` – przyjmuje parametry wejściowe, wykonuje żądanie do LLM (OpenRouter/OpenAI) z ustalonym promptem i oczekuje JSON (`setName`, `flashcards[]` z `front`/`back`).
- `POST /api/v1/ai/accept` – zapisuje zaakceptowany zestaw (re-use istniejących serwisów `createSetWithFlashcards`).
- Obsługa błędów (limity, niepoprawny JSON z modelu), powiadomienia toast.

### 13. Kolejne kroki developmentu (proponowana kolejność)
1. Przygotować kontekst `AiGenerationContext` + provider.
2. Zaimplementować formularz `/generate-ai` + weryfikację wejścia.
3. Dodać endpoint proxy + logikę wywołania LLM.
4. Stworzyć widok `/generate-ai/preview` z edycją i akcjami akceptacji/odrzucenia.
5. Połączyć `POST /api/v1/ai/accept` z istniejącą logiką tworzenia zestawów.
6. Testy manualne: puste wejście, za długi tekst, błędy 4xx/5xx z modelu, odrzucenie/akceptacja.

---

## 14. Podsumowanie

- Ręczny generator jest gotowy i zapewnia pełen CRUD w jednym widoku.
- Logowanie i zarządzanie tokenem zostały ustabilizowane.
- Dokument opisuje planowane rozszerzenie o generator AI, które wykorzysta dotychczasowe wzorce i serwisy API.
- Następne zadania: dopracowanie UX/obsługi błędów, aktualizacja dokumentacji API oraz implementacja `/generate-ai` zgodnie z opisanym planem.
