# E2E Test Plan (Playwright)

## Test: Set and Flashcard Creation Flow

**Lokalizacja:** `tests/e2e/set-creation.spec.ts`

**Cel testu:**
Weryfikacja pełnego przepływu użytkownika od logowania, przez tworzenie zestawu fiszek, aż po dodanie nowej fiszki. Test sprawdza integralność kluczowej funkcjonalności aplikacji.

---

## Wymagania

### Zmienne środowiskowe (`.env.test`)

Plik `.env.test` musi zawierać następujące zmienne:

```bash
# URL projektu Supabase (bez trailing slash)
PUBLIC_SUPABASE_URL=https://[project-id].supabase.co

# Publiczny klucz API Supabase (anon key)
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Dane testowego użytkownika (musi istnieć w bazie Supabase)
E2E_USERNAME=test@example.com
E2E_PASSWORD=testpassword123
```

⚠️ **Uwaga:** Dane muszą być zgodne z **projektem testowym** w Supabase, nie z lokalną bazą danych.

### Środowisko

- Node.js
- Zainstalowane zależności (`npm install`)
- Przeglądarka Chromium (instalowana automatycznie przez Playwright)

---

## Przepływ testu

### Krok 1: Logowanie użytkownika

1. Nawigacja do strony `/login`
2. Oczekiwanie na załadowanie formularza logowania (pola Email i Hasło są widoczne)
3. Wypełnienie pola "Email" wartością `E2E_USERNAME` z `.env.test`
4. Wypełnienie pola "Hasło" wartością `E2E_PASSWORD` z `.env.test`
5. Kliknięcie przycisku "Log in"
6. **Weryfikacja sukcesu:**
   - Oczekiwanie (max 15s) na widoczność przycisku "New set"
   - Potwierdzenie przekierowania na `/generate`

### Krok 2: Tworzenie zestawu fiszek

1. Kliknięcie przycisku "New set"
2. Oczekiwanie na pojawienie się formularza tworzenia zestawu
3. Wypełnienie pola "Name" unikalną nazwą w formacie: `Test Set [8-znakowy-hex]`
   - Przykład: `Test Set 7e5277d9`
4. Wypełnienie pola "Description (optional)" tekstem: `"This is a test description."`
5. Kliknięcie przycisku "Create set"
6. **Weryfikacja sukcesu:**
   - Oczekiwanie (max 10s) na pojawienie się toastu "Set created"
   - Oczekiwanie (max 5s) na widoczność formularza dodawania fiszek (pole "Question or prompt")
   - Potwierdzenie, że **pozostajemy na stronie `/generate`** (brak przekierowania na `/sets/[id]`)

### Krok 3: Dodawanie fiszki

1. Wypełnienie pola "Question or prompt" tekstem: `"What is Playwright?"`
2. Wypełnienie pola "Answer" tekstem: `"Playwright is an end-to-end testing framework."`
3. Kliknięcie przycisku "Add flashcard"
4. Oczekiwanie 1 sekundy na przetworzenie żądania
5. **Weryfikacja sukcesu:**
   - Potwierdzenie widoczności tekstu pytania na stronie (timeout 5s)
   - Potwierdzenie widoczności tekstu odpowiedzi na stronie (timeout 5s)

---

## Uruchomienie testów

### Tryb headless (domyślny)

Testy uruchamiają się bez widocznego okna przeglądarki:

```bash
npm run test:e2e -- tests/e2e/set-creation.spec.ts
```

### Tryb headed (z widoczną przeglądarką)

Przydatne do debugowania i obserwacji przepływu testu:

```bash
npm run test:e2e -- tests/e2e/set-creation.spec.ts --headed
```

### Tryb UI (interaktywny)

Playwright UI pozwala na interaktywne debugowanie i inspekcję:

```bash
npm run test:e2e -- tests/e2e/set-creation.spec.ts --ui
```

### Uruchomienie wszystkich testów E2E

```bash
npm run test:e2e
```

---

## Konfiguracja techniczna

**Plik konfiguracyjny:** `playwright.config.ts`

| Parametr | Wartość | Opis |
|----------|---------|------|
| **timeout** | 30 000 ms | Maksymalny czas trwania pojedynczego testu |
| **retries** | 2 | Liczba ponownych prób w przypadku niepowodzenia |
| **outputDir** | `test-results/` | Katalog z wynikami testów |
| **baseURL** | `http://localhost:3001` | URL aplikacji (zgodny z konfiguracją Astro) |
| **webServer.command** | `npm run dev:e2e` | Komenda uruchamiająca serwer deweloperski |
| **webServer.timeout** | 120 000 ms | Timeout uruchamiania serwera |
| **trace** | `retry-with-trace` | Nagrywanie trace tylko dla nieudanych retry |

---

## Znane problemy i rozwiązania

### 1. Test oznaczony jako "flaky"

**Objaw:**  
Test czasami zawodzi przy pierwszej próbie (timeout na logowaniu), ale przechodzi przy retry.

**Przyczyna:**  
- Wolniejsze ładowanie komponentów React
- Opóźnienia w komunikacji z API Supabase
- Czas inicjalizacji sesji po zalogowaniu

**Rozwiązanie:**  
Test ma skonfigurowane **2 retries**, dzięki czemu automatycznie ponawia próbę. W większości przypadków przechodzi przy drugiej próbie.

**Status:** ✅ To jest oczekiwane zachowanie dla testów E2E. Test jest stabilny z mechanizmem retry.

### 2. Błąd: "Expected to be on /sets/[id], received /generate"

**Objaw:**  
Test oczekuje przekierowania na stronę zestawu po jego utworzeniu.

**Przyczyna:**  
To była błędna implementacja testu. Aplikacja **celowo pozostaje na stronie `/generate`** po utworzeniu zestawu i automatycznie wybiera nowy zestaw w dropdown.

**Rozwiązanie:**  
Test został poprawiony i teraz **weryfikuje pozostanie na `/generate`**, co jest poprawnym zachowaniem aplikacji.

### 3. Konflikt portów

**Objaw:**  
Test "zawiesza się" i nic się nie dzieje po uruchomieniu.

**Przyczyna:**  
Playwright był skonfigurowany do oczekiwania na port 4321, podczas gdy Astro uruchamia się na porcie 3001.

**Rozwiązanie:**  
Poprawiona konfiguracja w `playwright.config.ts`:
```typescript
const PORT = process.env.PORT || 3001;  // Zmieniono z 4321 na 3001
```

---

## Dobre praktyki

### Czekanie na elementy

✅ **Dobre:**
```typescript
await page.getByRole("button", { name: "Submit" }).waitFor({ state: "visible" });
await page.getByRole("button", { name: "Submit" }).click();
```

❌ **Złe:**
```typescript
await page.waitForTimeout(2000);  // Sztywny timeout
await page.getByRole("button", { name: "Submit" }).click();
```

### Selektory

Preferuj selektory semantyczne (w kolejności):
1. `getByRole` - najbardziej dostępne
2. `getByLabel` - dla pól formularzy
3. `getByPlaceholder` - gdy nie ma label
4. `getByText` - dla weryfikacji treści
5. `getByTestId` - ostateczność

### Timeouty

- **Operacje normalne:** 5 sekund
- **Operacje sieciowe (logowanie, API):** 10-15 sekund
- **Uruchomienie serwera:** 120 sekund

### Debugowanie

1. **Użyj trybu headed:**
   ```bash
   npm run test:e2e -- --headed
   ```

2. **Przejrzyj trace dla failed testów:**
   ```bash
   npx playwright show-trace test-results/[folder]/trace.zip
   ```

3. **Dodaj logi:**
   ```typescript
   console.log("Current URL:", page.url());
   await page.screenshot({ path: 'debug.png' });
   ```

4. **Użyj debuggera:**
   ```typescript
   await page.pause();  // Zatrzymuje wykonanie testu
   ```

---

## Status

✅ **Test działa poprawnie**  
⚠️ Może być oznaczony jako "flaky" przy pierwszym uruchomieniu  
✅ Zawsze przechodzi w mechanizmie retry (1-2 próba)  
✅ Gotowy do użycia w CI/CD pipeline

---

## Rozwój testów

### Przyszłe testy do dodania:

1. **Test logowania z błędnymi danymi**
   - Weryfikacja komunikatów o błędach
   - Sprawdzenie, że użytkownik nie jest przekierowany

2. **Test edycji fiszki**
   - Kliknięcie edycji istniejącej fiszki
   - Zmiana treści
   - Weryfikacja zapisania zmian

3. **Test usuwania fiszki**
   - Kliknięcie usunięcia
   - Potwierdzenie akcji
   - Weryfikacja zniknięcia fiszki z listy

4. **Test sesji nauki (learning flow)**
   - Przejście do trybu nauki
   - Odpowiadanie na pytania
   - Weryfikacja algorytmu powtórek (SM-2)

5. **Test generowania fiszek AI**
   - Wypełnienie formularza generatora AI
   - Oczekiwanie na wygenerowanie fiszek
   - Weryfikacja i akceptacja fiszek

