# Architektura UI dla Fiszki AI

## 1. Przegląd Struktury UI

Architektura UI została zaprojektowana jako aplikacja jednostronicowa (SPA) z renderowaniem po stronie klienta, zbudowana na frameworku Astro z komponentami React. Wykorzystuje bibliotekę komponentów Shadcn/ui do zapewnienia spójności wizualnej i szybkiego rozwoju. Zarządzanie stanem serwera opiera się na TanStack Query (React Query) w celu efektywnego buforowania danych i synchronizacji z API. Kluczowe przepływy, takie jak generowanie fiszek przez AI, są zarządzane przez dedykowany kontekst React (`AIgenerationContext`), aby zapewnić płynne i stanowe doświadczenie użytkownika.

Nawigacja opiera się na centralnym, statycznym panelu bocznym (sidebar), który zapewnia dostęp do wszystkich głównych sekcji aplikacji. Projekt kładzie nacisk na wzorce UX, takie jak optymistyczne aktualizacje, obsługa stanów pustych i ładowania, oraz jasne komunikaty zwrotne dla użytkownika za pomocą powiadomień typu toast.

## 2. Lista Widoków

### Widok: Logowanie Deweloperskie
- **Ścieżka**: `/dev-login` (dostępny tylko w trybie deweloperskim)
- **Główny Cel**: Umożliwienie deweloperom szybkiego logowania się jako predefiniowany użytkownik w celu testowania zabezpieczonych tras i funkcjonalności.
- **Kluczowe Informacje**: Formularz z danymi logowania.
- **Kluczowe Komponenty**: `Input`, `Button`, `Card`.
- **UX, Dostępność, Bezpieczeństwo**: Widok musi być wyłączony w buildach produkcyjnych. Powinien zawierać wyraźne ostrzeżenie, że jest to narzędzie wyłącznie deweloperskie.

### Widok: Dashboard
- **Ścieżka**: `/` lub `/dashboard`
- **Główny Cel**: Stanowienie centralnego punktu startowego, oferującego szybki dostęp do kluczowych akcji i przegląd ostatniej aktywności.
- **Kluczowe Informacje**: Lista ostatnio używanych zestawów fiszek, przyciski szybkiej akcji ("Generuj nowy zestaw z AI", "Rozpocznij naukę").
- **Kluczowe Komponenty**: `Card`, `Button`, `Table` (dla listy zestawów).
- **UX, Dostępność, Bezpieczeństwo**: Interfejs powinien być przejrzysty i intuicyjny. Akcje powinny być jasno oznaczone.

### Widok: Moje Zestawy (Lista)
- **Ścieżka**: `/sets`
- **Główny Cel**: Umożliwienie użytkownikowi przeglądania, wyszukiwania i zarządzania wszystkimi swoimi zestawami fiszek.
- **Kluczowe Informacje**: Paginowana tabela zestawów z kolumnami: Nazwa, Opis, Data modyfikacji.
- **Kluczowe Komponenty**: `Table`, `Button` ("Stwórz nowy zestaw"), `Pagination`, `DropdownMenu` (dla akcji Edytuj/Usuń przy każdym zestawie).
- **UX, Dostępność, Bezpieczeństwo**: Tabela powinna umożliwiać sortowanie. Paginacja typu "Załaduj więcej" upraszcza interfejs. Akcje na zestawie powinny wymagać potwierdzenia (np. usunięcie). W przypadku braku zestawów, widok powinien wyświetlać pomocny komunikat z wezwaniem do działania.

### Widok: Szczegóły Zestawu
- **Ścieżka**: `/sets/:setId`
- **Główny Cel**: Wyświetlanie wszystkich fiszek w ramach jednego zestawu oraz umożliwienie zarządzania nimi.
- **Kluczowe Informacje**: Nazwa i opis zestawu. Lista fiszek (awers i rewers).
- **Kluczowe Komponenty**: `Card` (dla każdej fiszki), `Button` ("Dodaj nową fiszkę", "Rozpocznij naukę tego zestawu"), `Dialog` (do edycji/dodawania fiszek), `DropdownMenu` (dla akcji Edytuj/Usuń/Oceń przy fiszkach).
- **UX, Dostępność, Bezpieczeństwo**: Operacje edycji i usuwania będą stosować wzorzec "Optimistic UI", aby interfejs był responsywny. Edycja w oknie modalnym (`Dialog`) zapobiega zmianie kontekstu.

### Widok: Generator AI (Formularz)
- **Ścieżka**: `/generate`
- **Główny Cel**: Udostępnienie interfejsu do wprowadzenia tekstu w celu wygenerowania fiszek przez AI.
- **Kluczowe Informacje**: Formularz z polami "Nazwa zestawu" i "Tekst źródłowy".
- **Kluczowe Komponenty**: `Input`, `Textarea`, `Button` ("Generuj fiszki"), `Form`.
- **UX, Dostępność, Bezpieczeństwo**: Jasne instrukcje i ewentualny licznik znaków w polu tekstowym. Przycisk generowania powinien pokazywać stan ładowania, aby poinformować użytkownika o trwającym procesie. Walidacja formularza po stronie klienta.

### Widok: Generator AI (Podgląd)
- **Ścieżka**: `/generate/preview`
- **Główny Cel**: Umożliwienie użytkownikowi przeglądu, edycji i zatwierdzenia fiszek wygenerowanych przez AI przed ich trwałym zapisaniem.
- **Kluczowe Informacje**: Nazwa proponowanego zestawu. Lista wygenerowanych, edytowalnych fiszek.
- **Kluczowe Komponenty**: Lista edytowalnych kart (`Input`/`Textarea`), `Button` ("Zapisz zestaw", "Odrzuć"), przycisk do dodawania nowej fiszki, przycisk usuwania przy każdej fiszce.
- **UX, Dostępność, Bezpieczeństwo**: Kluczowy ekran w przepływie użytkownika. Edycja inline musi być prosta i intuicyjna. Różnica między akcjami "Zapisz" i "Odrzuć" musi być wyraźnie zakomunikowana. Stan tego widoku jest zarządzany przez globalny kontekst, co oznacza, że odświeżenie strony może spowodować utratę danych – użytkownik powinien być o tym poinformowany.

### Widok: Sesja Nauki
- **Ścieżka**: `/learn`
- **Główny Cel**: Przeprowadzenie użytkownika przez sesję nauki z wykorzystaniem algorytmu powtórek.
- **Kluczowe Informacje**: Awers fiszki, a po odkryciu – rewers oraz przyciski do oceny jakości odpowiedzi (0-5).
- **Kluczowe Komponenty**: `Card`, `Button` ("Pokaż odpowiedź"), zestaw przycisków oceny, `Progress` bar (pokazujący postęp sesji).
- **UX, Dostępność, Bezpieczeństwo**: Interfejs powinien być minimalistyczny i wolny od rozpraszaczy. Znaczenie ocen (0-5) musi być jasno opisane (np. "Kompletnie nie wiem", "Idealnie"). Skróty klawiaturowe dla akcji "pokaż" i ocen znacznie poprawią użyteczność.

### Widok: Profil Użytkownika
- **Ścieżka**: `/profile`
- **Główny Cel**: Zarządzanie ustawieniami konta użytkownika.
- **Kluczowe Informacje**: Formularz do edycji nazwy użytkownika, adresu URL awatara, ustawień powiadomień. Przycisk wylogowania.
- **Kluczowe Komponenty**: `Form`, `Input`, `Switch`, `Button` ("Zapisz zmiany", "Wyloguj").
- **UX, Dostępność, Bezpieczeństwo**: Zapewnienie jasnego feedbacku po zapisaniu zmian (`Toast`). Funkcja wylogowania musi bezpiecznie usuwać wszystkie dane sesji po stronie klienta.

## 3. Mapa Podróży Użytkownika (Główny Przepływ: Generowanie Zestawu z AI)

1.  **Inicjacja**: Użytkownik na **Dashboardzie** (`/`) klika przycisk "Generuj nowy zestaw z AI".
2.  **Przekierowanie**: Aplikacja przenosi użytkownika do widoku **Generatora AI** (`/generate`).
3.  **Wprowadzanie Danych**: Użytkownik wpisuje nazwę dla nowego zestawu i wkleja tekst źródłowy w odpowiednie pola formularza.
4.  **Generowanie**: Po kliknięciu "Generuj fiszki", aplikacja wysyła żądanie `POST /api/v1/ai/generate-flashcards`. Interfejs pokazuje stan ładowania.
5.  **Przechowanie i Przekierowanie**: Odpowiedź z API (`temp_id`, `flashcards`) jest zapisywana w `AIgenerationContext`. Użytkownik jest automatycznie przekierowywany do widoku **Podglądu** (`/generate/preview`).
6.  **Przegląd i Edycja**: Użytkownik przegląda wygenerowane fiszki. Może edytować treść każdej z nich, usuwać niechciane karty lub dodawać nowe.
7.  **Decyzja Końcowa**:
    *   **Akceptacja**: Użytkownik klika "Zapisz zestaw". Aplikacja wysyła zawartość `AIgenerationContext` na endpoint `POST /api/v1/ai/accept-flashcards`. Po sukcesie wyświetla powiadomienie `Toast` i przekierowuje do widoku **Szczegółów Zestawu** (`/sets/:newSetId`).
    *   **Odrzucenie**: Użytkownik klika "Odrzuć". Kontekst `AIgenerationContext` jest czyszczony, a użytkownik jest przekierowywany z powrotem na **Dashboard** (`/`).

## 4. Układ i Struktura Nawigacji

- **Nawigacja Główna**: Zostanie zaimplementowana jako statyczny, pionowy panel boczny (sidebar) po lewej stronie ekranu.
- **Linki w Sidebarze**:
    - Dashboard (`/`)
    - Moje Zestawy (`/sets`)
    - Generator AI (`/generate`)
    - Nauka (`/learn`)
- **Nawigacja Użytkownika**: W dolnej części sidebara lub w prawym górnym rogu ekranu znajdzie się menu użytkownika (`DropdownMenu`) dostępne po kliknięciu na awatar. Będzie ono zawierać linki do **Profilu Użytkownika** (`/profile`) oraz przycisk **Wyloguj**.
- **Nawigacja Kontekstowa**: W widokach zagnieżdżonych, jak **Szczegóły Zestawu**, mogą być użyte ścieżki nawigacyjne (breadcrumbs) dla lepszej orientacji (np. `Moje Zestawy > Nazwa Zestawu`).

## 5. Kluczowe Komponenty (Współdzielone)

Poniższe komponenty z biblioteki Shadcn/ui będą stanowić podstawę systemu projektowego i będą używane w całej aplikacji:

- **`Button`**: Do wszystkich akcji wykonywanych przez użytkownika.
- **`Card`**: Do wizualnego grupowania powiązanych informacji (np. pojedyncza fiszka, sekcja na dashboardzie).
- **`Dialog`**: Do wyświetlania formularzy edycji lub potwierdzeń bez opuszczania bieżącego widoku.
- **`Toast`**: Do dostarczania globalnych, nieblokujących powiadomień (błędy, sukcesy).
- **`Table`**: Do prezentacji danych tabelarycznych (np. lista zestawów).
- **`Input`, `Textarea`, `Label`**: Standardowe elementy formularzy.
- **`DropdownMenu`**: Dla menu kontekstowych z dodatkowymi akcjami (np. edytuj/usuń).
- **`Progress`**: Do wizualizacji postępu (np. w sesji nauki).

## 6. Mapowanie Wymagań (PRD) na Architekturę UI

| Historyjka Użytkownika (ID) | Wymaganie Funkcjonalne (ID) | Element Architektury UI / Przepływ |
| :--- | :--- | :--- |
| US-001, US-002 | FW-004 | **Widok: Logowanie Deweloperskie** (`/dev-login`) jako rozwiązanie MVP. W przyszłości pełny system logowania i rejestracji. |
| US-003, US-005, US-006 | FW-001, FW-006, FW-008 | Główny przepływ użytkownika: **Generator AI (Formularz)** (`/generate`) -> **Generator AI (Podgląd)** (`/generate/preview`). |
| US-004 | FW-002 | Przycisk "Dodaj nową fiszkę" i formularz w oknie `Dialog` w widoku **Szczegółów Zestawu** (`/sets/:setId`). |
| US-006 | FW-002 | Przycisk "Edytuj" i formularz w oknie `Dialog` w widoku **Szczegółów Zestawu** (`/sets/:setId`). |
| US-007 | FW-002 | Przycisk "Usuń" (z potwierdzeniem) w widoku **Szczegółów Zestawu** (`/sets/:setId`). |
| US-008 | FW-007 | Przyciski "kciuk w górę/dół" (`DropdownMenu` lub ikony) przy fiszkach w widoku **Szczegółów Zestawu**. |
| US-009 | FW-005 | **Widok: Sesja Nauki** (`/learn`). |
| (brak) | FW-003 | **Widok: Moje Zestawy** (`/sets`) i **Widok: Szczegóły Zestawu** (`/sets/:setId`). |

## 7. Rozwiązanie Problemów Użytkownika

Architektura UI bezpośrednio adresuje główny problem użytkownika, czyli czasochłonność manualnego tworzenia fiszek, poprzez:

1.  **Centralizację Przepływu AI**: Dedykowane widoki `/generate` i `/generate/preview` tworzą prostą i prowadzącą za rękę ścieżkę od surowego tekstu do gotowego zestawu fiszek.
2.  **Elastyczność i Kontrolę**: Widok podglądu daje użytkownikowi pełną kontrolę nad wynikiem pracy AI, pozwalając na edycję i korektę przed zapisaniem, co buduje zaufanie do narzędzia.
3.  **Szybkość i Responsywność**: Wykorzystanie wzorców takich jak "Optimistic UI" oraz wydajne zarządzanie stanem serwera sprawia, że interfejs jest szybki, co zachęca do regularnego korzystania z aplikacji.
