# Architektura UI dla Fiszki AI

## 1. Przegląd Struktury UI

Architektura UI została zaprojektowana jako aplikacja jednostronicowa (SPA) z renderowaniem po stronie klienta, zbudowana na frameworku Astro z komponentami React. Wykorzystuje bibliotekę komponentów Shadcn/ui do zapewnienia spójności wizualnej i szybkiego rozwoju. Zarządzanie stanem serwera opiera się na TanStack Query (React Query) w celu efektywnego buforowania danych i synchronizacji z API. Kluczowe przepływy, takie jak ręczne zarządzanie fiszkami czy w przyszłości generowanie fiszek przez AI, wykorzystują wyspecjalizowane widoki React (`ManualFlashcardForm`, planowany `AiGenerationFlow`) oparte na wspólnych providerach (`AuthProvider`, `QueryClientProvider`).

Nawigacja opiera się na statycznym panelu bocznym (sidebar) zapewniającym dostęp do wszystkich głównych sekcji. Projekt kładzie nacisk na wzorce UX, takie jak optymistyczne aktualizacje, obsługa stanów pustych i ładowania oraz jasne komunikaty zwrotne (toasty). Token JWT jest przechowywany w `sessionStorage` i odczytywany przez globalny kontekst, co umożliwia utrzymanie sesji między przeładowaniami stron.

## 2. Lista Widoków

### Widok: Logowanie
- **Ścieżka**: `/login`
- **Główny Cel**: Uwierzytelnienie użytkownika i rozpoczęcie sesji aplikacji.
- **Kluczowe Informacje**: Formularz (email, hasło), komunikaty walidacyjne, informacja o błędach API.
- **Kluczowe Komponenty**: `Card`, `Form`, `Input`, `Button`, `Toast`.
- **UX, Bezpieczeństwo**: Walidacja po stronie klienta i serwera, blokada przycisku podczas zapytań, zapisywanie tokenu w `sessionStorage`.

### Widok: Dashboard
- **Ścieżka**: `/` lub `/dashboard`
- **Główny Cel**: Start aplikacji, szybki dostęp do najważniejszych akcji (manualne i AI).
- **Kluczowe Informacje**: Ostatnie zestawy, skróty do `/generate` i planowanego `/generate-ai`.
- **Kluczowe Komponenty**: `Card`, `Button`, `Table`.

### Widok: Moje Zestawy (Lista)
- **Ścieżka**: `/sets`
- **Główny Cel**: Przegląd i zarządzanie wszystkimi zestawami.
- **Kluczowe Informacje**: Paginacja, sortowanie, stany pustych danych.
- **Kluczowe Komponenty**: `Table`, `DropdownMenu`, `Pagination`, `Dialog`.
- **UX**: Potwierdzenia akcji destrukcyjnych, filtrowanie po nazwie (w planie).

### Widok: Szczegóły Zestawu
- **Ścieżka**: `/sets/:setId`
- **Główny Cel**: Podgląd i edycja fiszek w pojedynczym zestawie.
- **Kluczowe Informacje**: Lista fiszek, metadane zestawu, statystyki nauki (w planie).
- **Kluczowe Komponenty**: `Card`, `Button`, `Dialog`, `Form`.
- **UX**: Edycja inline, optymistyczne aktualizacje, potwierdzenia usuwania.

### Widok: Generator Fiszek (Manualny)
- **Ścieżka**: `/generate`
- **Główny Cel**: Ręczne tworzenie i edycja fiszek w obrębie zestawów.
- **Kluczowe Informacje**: Lista zestawów (Select), formularz front/back, możliwość tworzenia nowego zestawu, lista istniejących fiszek z trybem edycji/usuń.
- **Kluczowe Komponenty**: `Select`, `Input`, `Textarea`, `Card`, `Button`, `Toast`.
- **UX**: Sekcja „Create new set” rozwijana tylko przy wyborze opcji „New set”, automatyczny wybór nowo utworzonego zestawu, blokada przycisków podczas mutacji, potwierdzenie `window.confirm` przy usuwaniu.

### Widok: Generator AI (Formularz – planowany)
- **Ścieżka**: `/generate-ai`
- **Główny Cel**: Pozyskanie tekstu źródłowego i parametrów do wygenerowania fiszek przez LLM.
- **Kluczowe Informacje**: Formularz (nazwa zestawu, tekst źródłowy, liczba fiszek, język), stan wysyłki, logi postępu.
- **Kluczowe Komponenty**: `Form`, `Textarea`, `Button` z loaderem, `Alert` na błędy API.
- **UX**: Jasne instrukcje dot. formatu tekstu, wskazówka o limitach i czasie generowania, informacje o kosztach/limitach (jeśli dotyczy).

### Widok: Generator AI (Podgląd – planowany)
- **Ścieżka**: `/generate-ai/preview`
- **Główny Cel**: Przegląd, korekta i zatwierdzenie zestawu wygenerowanego przez AI.
- **Kluczowe Informacje**: Proponowana nazwa zestawu, edytowalna lista fiszek, akcje „Zapisz”/„Odrzuć”.
- **Kluczowe Komponenty**: Edytowalne karty (`Input`, `Textarea`), `Button`, `Toast`.
- **UX**: Informacja o utracie danych przy odświeżeniu (stan w kontekście), możliwość dodania/usunięcia fiszek przed akceptacją.

### Widok: Sesja Nauki
- **Ścieżka**: `/learn`
- **Główny Cel**: Przeprowadzanie użytkownika przez sesję nauki.
- **Kluczowe Informacje**: Treść fiszki, ocena (0-5), postęp.
- **Kluczowe Komponenty**: `Card`, `Button`, `Progress`, skróty klawiaturowe.

### Widok: Profil Użytkownika
- **Ścieżka**: `/profile`
- **Główny Cel**: Zarządzanie profilem i ustawieniami.
- **Kluczowe Informacje**: Dane profilu, preferencje powiadomień, akcja wylogowania.
- **Komponenty**: `Form`, `Input`, `Switch`, `Button`, `Toast`.

## 3. Mapy Podróży Użytkownika

### 3.1. Logowanie → Ręczne zarządzanie fiszkami
1. Użytkownik trafia na `/login` i podaje dane uwierzytelniające.
2. Po pozytywnej odpowiedzi API token JWT trafia do `sessionStorage`; użytkownik jest przekierowany na `/generate`.
3. Strona `/generate` odczytuje token, ładuje dostępne zestawy i pokazuje formularz tworzenia fiszek.
4. Użytkownik może:
   - wybrać istniejący zestaw i dodać do niego fiszkę,
   - kliknąć „New set”, rozwinąć formularz i utworzyć nowy zestaw,
   - edytować lub usunąć istniejące fiszki w trybie inline,
   - wylogować się przyciskiem „Log out” (czyszczenie tokenu + redirect).

### 3.2. Generowanie AI (planowany przepływ)
1. Użytkownik z `/dashboard` wybiera „Generate with AI” → `/generate-ai`.
2. Podaje nazwę zestawu, język, tekst źródłowy, opcjonalne parametry (liczba fiszek, ton etc.).
3. `POST /api/v1/ai/generate` rozpoczyna żądanie do zewnętrznego LLM (OpenRouter/OpenAI). Widok pokazuje loader i ewentualnie postęp.
4. Po sukcesie dane (tymczasowy zestaw) trafiają do kontekstu `AiGenerationContext` i użytkownik jest przekierowany na `/generate-ai/preview`.
5. Użytkownik przegląda/edytuje fiszki, może je zatwierdzić (`POST /api/v1/ai/accept`) lub odrzucić (czyszczenie kontekstu + redirect na `/dashboard`).

## 4. Układ i Struktura Nawigacji

- **Sidebar**: linki do `Dashboard`, `Moje Zestawy`, `Generate` (manualne), `Generate AI` (planowane), `Learn`.
- **Menu użytkownika**: profil, ustawienia, wylogowanie.
- **Breadcrumbs**: np. `Moje Zestawy > [nazwa zestawu]` dla widoków zagnieżdżonych.

## 5. Kluczowe Komponenty (Współdzielone)

Komponenty Shadcn/ui i custom:
- `Button`, `Card`, `Dialog`, `Toast`, `Table`, `Input`, `Textarea`, `Select`, `DropdownMenu`, `Progress`, `Alert`, `Spinner`.
- Konteksty: `AuthProvider`, `QueryClientProvider`, planowany `AiGenerationProvider`.

## 6. Mapowanie Wymagań (PRD) na Architekturę UI

| Historyjka | Wymaganie | Element UI |
| --- | --- | --- |
| US-001, US-002 | FW-004 | `/login` + globalny `AuthProvider` |
| US-003, US-005, US-006 | FW-001, FW-006, FW-008 | `/generate` (manualny generator z listą fiszek i inline CRUD) |
| US-004 | FW-002 | Formularz dodawania fiszek w `/generate` |
| US-006 | FW-002 | Tryb edycji inline w `/generate` (oraz `/sets/:setId`) |
| US-007 | FW-002 | Usuwanie fiszek w `/generate` i `/sets/:setId` |
| US-008 | FW-007 | System ocen na poziomie fiszek (w planie dla widoków zestawów/AI) |
| US-009 | FW-005 | `/learn` |
| (AI roadmap) | FW-001, FW-006, FW-008 | `/generate-ai` → `/generate-ai/preview` + API AI |

## 7. Rozwiązanie Problemów Użytkownika

1. **Bezpieczny dostęp**: JWT w `sessionStorage` + `AuthContext`, ochrona tras.
2. **Manualna kontrola**: `/generate` pozwala szybko tworzyć, edytować i usuwać fiszki bez zmiany kontekstu.
3. **Przygotowanie pod AI**: zaplanowany `/generate-ai` wykorzysta te same wzorce UI (Select, listy, toasty), dzięki czemu rozszerzenie funkcjonalności nie będzie wymagało przebudowy struktury.
4. **Responsywność**: loader’y, stany pustych danych i optymistyczne aktualizacje zapewniają płynne doświadczenie.
