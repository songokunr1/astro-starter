# Plan wdrożenia CI/CD dla Fiszki AI

## 1. Stan obecny

❌ **Brak konfiguracji CI/CD**
- Folder `.github/workflows/` nie istnieje
- Brak automatycznych testów przy pull requestach
- Brak automatycznej weryfikacji kodu przed mergem

## 2. Cele wdrożenia CI/CD

### Cele główne:
1. ✅ Automatyczne uruchamianie testów Vitest przy każdym PR
2. ✅ Automatyczne uruchamianie testów Playwright E2E przy każdym PR
3. ✅ Weryfikacja kodu (linting, type checking)
4. ✅ Sprawdzanie poprawności buildu
5. ✅ Blokowanie merge'a gdy testy nie przechodzą

### Cele dodatkowe (opcjonalne):
- 📊 Raportowanie pokrycia kodu (code coverage)
- 🚀 Automatyczne wdrażanie na staging/production (Vercel/Netlify)
- 📈 Monitoring wydajności testów

## 3. Architektura CI/CD

### Workflow: `ci.yml`

```
PR/Push → main/develop
    ↓
┌─────────────────────────────────────┐
│  GitHub Actions Workflow            │
├─────────────────────────────────────┤
│  Job 1: Code Quality                │
│  - Lint (ESLint)                    │
│  - Type Check (TypeScript)          │
│  - Format Check (Prettier)          │
├─────────────────────────────────────┤
│  Job 2: Unit Tests                  │
│  - Vitest (wszystkie testy)         │
│  - Coverage report                  │
├─────────────────────────────────────┤
│  Job 3: Build                       │
│  - Astro build                      │
│  - Weryfikacja brak błędów          │
├─────────────────────────────────────┤
│  Job 4: E2E Tests                   │
│  - Playwright (Chrome)              │
│  - Automatyczne uruchomienie serwera│
│  - Retry mechanism                  │
│  - Upload artifacts (traces, videos)│
└─────────────────────────────────────┘
    ↓
Wszystkie joby sukces? → ✅ Merge dozwolony
Jakikolwiek job fail?   → ❌ Merge zablokowany
```

### Strategia wykonania:

**Równoległe joby (szybsze):**
```yaml
jobs:
  lint:      # ~30s
  typecheck: # ~45s
  test:      # ~1-2min
  build:     # ~2-3min
  e2e:       # ~3-5min (najdłuższy)
```

Wszystkie joby działają równolegle (poza zależnościami), całkowity czas: **~5-7 minut**

## 4. Szczegółowy plan implementacji

### Faza 1: Przygotowanie (30 min)

#### Krok 1.1: Utworzenie struktury folderów
```bash
mkdir -p .github/workflows
```

#### Krok 1.2: Przygotowanie secrets w GitHub
Przejdź do: `Settings` → `Secrets and variables` → `Actions`

Dodaj następujące secrets:

| Nazwa | Wartość | Cel |
|-------|---------|-----|
| `SUPABASE_URL_TEST` | URL testowego projektu Supabase | Testy E2E |
| `SUPABASE_ANON_KEY_TEST` | Anon key testowego projektu | Testy E2E |
| `E2E_USERNAME` | Email testowego użytkownika | Logowanie w testach |
| `E2E_PASSWORD` | Hasło testowego użytkownika | Logowanie w testach |

⚠️ **Uwaga:** NIE commituj żadnych prawdziwych kluczy do repo!

#### Krok 1.3: Weryfikacja skryptów w package.json
Upewnij się, że mamy wszystkie potrzebne skrypty:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "build": "astro build"
  }
}
```

### Faza 2: Implementacja workflow (1-2 godz)

#### Krok 2.1: Utworzenie głównego workflow
**Plik:** `.github/workflows/ci.yml`

**Zawartość:**
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

# Anuluj poprzednie uruchomienia tego workflow dla tego samego PR
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # Job 1: Linting i formatowanie
  lint:
    name: Lint & Format Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run ESLint
        run: npm run lint
      
      - name: Check formatting
        run: npm run format -- --check

  # Job 2: Type checking
  typecheck:
    name: TypeScript Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run TypeScript compiler
        run: npx tsc --noEmit

  # Job 3: Testy jednostkowe
  test:
    name: Unit Tests (Vitest)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run Vitest
        run: npm run test
      
      # Opcjonalnie: generowanie coverage
      - name: Generate coverage report
        run: npm run test:coverage
        continue-on-error: true
      
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        if: always()
        continue-on-error: true

  # Job 4: Build
  build:
    name: Build Application
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build Astro app
        run: npm run build
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
          retention-days: 1

  # Job 5: Testy E2E
  e2e:
    name: E2E Tests (Playwright)
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
      
      - name: Create .env.test file
        run: |
          echo "PUBLIC_SUPABASE_URL=${{ secrets.SUPABASE_URL_TEST }}" >> .env.test
          echo "PUBLIC_SUPABASE_ANON_KEY=${{ secrets.SUPABASE_ANON_KEY_TEST }}" >> .env.test
          echo "E2E_USERNAME=${{ secrets.E2E_USERNAME }}" >> .env.test
          echo "E2E_PASSWORD=${{ secrets.E2E_PASSWORD }}" >> .env.test
      
      - name: Run Playwright tests
        run: npm run test:e2e
      
      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
      
      - name: Upload test traces
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-traces
          path: test-results/
          retention-days: 7
```

#### Krok 2.2: Dodanie skryptu format check do package.json
Jeśli nie istnieje, dodaj:
```json
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

### Faza 3: Konfiguracja Branch Protection (15 min)

Przejdź do: `Settings` → `Branches` → `Add branch protection rule`

**Konfiguracja dla `main`:**
```
Branch name pattern: main

☑️ Require a pull request before merging
  ☑️ Require approvals: 1
  ☑️ Dismiss stale pull request approvals when new commits are pushed

☑️ Require status checks to pass before merging
  ☑️ Require branches to be up to date before merging
  Status checks (zaznacz wszystkie):
    - lint
    - typecheck
    - test
    - build
    - e2e

☑️ Require conversation resolution before merging

☐ Require signed commits (opcjonalnie)

☑️ Include administrators (zalecane dla małych zespołów)
```

### Faza 4: Testowanie i weryfikacja (30 min)

#### Krok 4.1: Pierwsza testowa gałąź
```bash
git checkout -b test/ci-setup
git add .github/
git commit -m "ci: add GitHub Actions workflow"
git push origin test/ci-setup
```

#### Krok 4.2: Utworzenie test PR
1. Otwórz PR na GitHubie
2. Sprawdź, czy wszystkie joby się uruchomiły
3. Zweryfikuj logi każdego joba

#### Krok 4.3: Debugging typowych problemów

**Problem 1: Secrets nie działają**
- Sprawdź, czy są poprawnie ustawione w Settings
- Upewnij się, że używasz `${{ secrets.NAME }}` a nie `${{ env.NAME }}`

**Problem 2: Playwright timeout**
- Zwiększ `timeout-minutes` w job e2e
- Sprawdź logi serwera deweloperskiego

**Problem 3: Vitest fail**
- Uruchom lokalnie: `npm run test`
- Sprawdź, czy wszystkie env vars są ustawione

**Problem 4: Build fail**
- Sprawdź type errors: `npx tsc --noEmit`
- Uruchom build lokalnie: `npm run build`

## 5. Opcjonalne ulepszenia

### 5.1. Caching dla szybszych buildów

Dodaj do każdego joba:
```yaml
- name: Cache node_modules
  uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

### 5.2. Matrix testing (wiele wersji Node.js)

```yaml
strategy:
  matrix:
    node-version: [18, 20, 21]
```

### 5.3. Deployment workflow

**Plik:** `.github/workflows/deploy.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel
        uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

### 5.4. Automatyczne tworzenie release notes

**Plik:** `.github/workflows/release.yml`

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Create Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 5.5. Scheduled tests (nightly)

```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # Codziennie o 2:00 UTC
```

## 6. Monitoring i utrzymanie

### 6.1. Metryki do śledzenia:
- ⏱️ Średni czas wykonania workflow (cel: < 10 min)
- ✅ Success rate (cel: > 95%)
- 🔄 Liczba retry w testach E2E (cel: < 20%)
- 📊 Code coverage (cel: > 80%)

### 6.2. Przegląd co tydzień:
- Analiza failed runs
- Optymalizacja wolnych testów
- Aktualizacja dependencies
- Sprawdzanie czy secrets są aktualne

### 6.3. Alerty i notyfikacje:

Opcjonalnie dodaj integrację ze Slack:
```yaml
- name: Notify Slack on failure
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
```

## 7. Checklist wdrożenia

### Pre-wdrożenie:
- [ ] Sprawdzenie, czy wszystkie testy przechodzą lokalnie
- [ ] Przygotowanie testowego użytkownika w Supabase (środowisko testowe)
- [ ] Potwierdzenie dostępu do ustawień repo (Settings)

### Wdrożenie:
- [ ] Utworzenie folderu `.github/workflows/`
- [ ] Dodanie pliku `ci.yml`
- [ ] Konfiguracja GitHub Secrets
- [ ] Dodanie skryptu `format:check` do `package.json`
- [ ] Commit i push workflow

### Po wdrożeniu:
- [ ] Utworzenie test PR
- [ ] Weryfikacja wszystkich jobów
- [ ] Konfiguracja branch protection
- [ ] Testowanie merge z przepuszczającym PR
- [ ] Testowanie blokowania merge z failującym PR
- [ ] Dokumentacja dla zespołu (jak czytać logi CI)

### Opcjonalne:
- [ ] Konfiguracja coverage reporting (Codecov)
- [ ] Dodanie deployment workflow
- [ ] Konfiguracja Slack notifications
- [ ] Matrix testing (wiele wersji Node.js)

## 8. Koszty i wydajność

### GitHub Actions - Free tier:
- **2000 minut/miesiąc** dla publicznych repo
- **500 MB storage** dla artifacts

### Szacowany koszt miesięczny (prywatne repo):
- 1 PR dziennie × 20 dni = 20 PR/miesiąc
- 7 minut/PR = **140 minut/miesiąc**
- Dodatkowo: push do main = ~50 minut/miesiąc
- **Razem: ~190 minut/miesiąc** (w ramach free tier)

### Optymalizacja kosztów:
- Uruchamiaj E2E tylko dla ważnych gałęzi
- Używaj cache dla node_modules
- Anuluj poprzednie runs (concurrency)
- Równoległe joby zamiast sekwencyjnych

## 9. Troubleshooting

### Problem: "Secrets not found"
**Rozwiązanie:** Sprawdź, czy secrets są dodane na poziomie repo, nie organizacji.

### Problem: E2E testy timeout
**Rozwiązanie:** 
1. Zwiększ `timeout-minutes` w job e2e do 15
2. Sprawdź logi Astro dev server
3. Upewnij się, że `.env.test` jest poprawnie utworzony

### Problem: "npm ci" fail
**Rozwiązanie:** Upewnij się, że `package-lock.json` jest commitnięty.

### Problem: Build fail z TypeScript errors
**Rozwiązanie:** Uruchom lokalnie `npx tsc --noEmit` i napraw błędy przed PR.

### Problem: Playwright "browser not found"
**Rozwiązanie:** Dodaj krok `npx playwright install --with-deps chromium` przed testami.

## 10. Następne kroki po wdrożeniu

1. **Tydzień 1:** Monitoring wszystkich runs, fixing failures
2. **Tydzień 2:** Dodanie coverage reporting
3. **Tydzień 3:** Optymalizacja czasu wykonania (caching)
4. **Miesiąc 2:** Rozważenie deployment automation
5. **Kwartalnie:** Przegląd i aktualizacja workflow

## 11. Dodatkowe zasoby

### Dokumentacja:
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Playwright CI Guide](https://playwright.dev/docs/ci)
- [Vitest CI Guide](https://vitest.dev/guide/ci)

### Przykładowe repo z dobrym CI:
- [Astro](https://github.com/withastro/astro)
- [Vitest](https://github.com/vitest-dev/vitest)
- [Playwright](https://github.com/microsoft/playwright)

---

## Status implementacji

📅 **Utworzono:** [DATA]  
👤 **Odpowiedzialny:** [IMIĘ]  
📊 **Status:** Planowanie  
🎯 **Termin realizacji:** [DATA]  

**Ostatnia aktualizacja:** [DATA]


