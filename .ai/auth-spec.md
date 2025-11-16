# Specyfikacja modułu autentykacji (rejestracja, logowanie, reset hasła)

Dokument opisuje architekturę funkcjonalności auth na bazie wymagań z `prd.md`, technologii ze `stack-tech.md` oraz istniejącego kodu (Astro 5 + React 19 + Supabase). Zakres obejmuje rejestrację, logowanie, wylogowywanie i odzyskiwanie hasła bez naruszania obecnych przepływów (manualne fiszki, AI).

## 0. Założenia i wymagania

- Wymagania PRD: US-001 (rejestracja), US-002 (logowanie). Dodajemy nową historyjkę **US-010 – Reset hasła**:
  - Jako użytkownik, który zapomniał hasła, chcę podać e-mail, otrzymać link resetujący i ustawić nowe hasło.
  - Kryteria: formularz e-mail, komunikat o wysłaniu instrukcji, zabezpieczenie przed enumeracją kont, formularz ustawiania nowego hasła z dwukrotnym wpisem i walidacją.
- Stack technologiczny:
  - Astro jako warstwa SSR/layoutowa, React dla formularzy (komponenty w `src/components/feature/auth`), TypeScript 5, Tailwind 4 + Shadcn/ui, TanStack Query, Sonner (toasty).
  - Supabase Auth jako jedyny backend auth (REST API `/auth/v1/*`, RLS dla danych).
  - Token przechowywany w `sessionStorage` (AuthProvider).
- Middleware `src/middleware/index.ts` sprawdza token (nagłówek `Authorization: Bearer`) dla `/api/v1/*` i dostarcza `context.locals.supabase`. Nie zmieniamy tej konwencji.

## 1. Architektura interfejsu użytkownika

### 1.1 Layouty, routing i odpowiedzialności

- `src/layouts/Layout.astro` – główny layout (meta, stylesheet). Bez zmian.
- **AuthLayout (nowy, opcjonalny)** – prosty wrapper Astro używany przez strony auth (`/login`, `/register`, `/reset-password`). Zawiera logo, sekcję na treść i linki do polityki, ale zero logiki. Każda strona auth importuje `AuthLayout` i montuje komponent React z `client:load`.
- Widoki chronione (`/generate`, `/sets`, `/dashboard`, przyszły `/generate-ai`) pozostają w dotychczasowym układzie. `AuthProvider` w React pilnuje, by bez tokenu nastąpił redirect do `/login`.

### 1.2 Strony Astro i komponenty React

| Ścieżka | Strona Astro | Komponent React | Rola Astro | Rola React |
| --- | --- | --- | --- | --- |
| `/login` | `src/pages/login.astro` | `LoginPage` → `LoginForm` (+ moduł żądania resetu) | Render layoutu, tytuł, mount React | Formularz logowania, walidacja, stany, toasty, redirect `/generate`; link „Resetuj hasło” uruchamia żądanie wysłania maila |
| `/register` | `src/pages/register.astro` | `RegisterPage` → `RegisterForm` | j.w. | Formularz rejestracji (email + hasło x2), walidacja, redirect `/login` |
| `/reset-password` (nowe) | `src/pages/reset-password.astro` | `ResetPasswordPage` → `ResetPasswordForm` | SSR layout, przekazanie tokenu z query | Formularz zmiany hasła (2 pola), walidacja tokenu, redirect `/login` |
| `/logout` (opcjonalne) | `src/pages/logout.astro` | brak | SSR – czyszczenie ciasteczek i redirect | - (główne wylogowanie dzieje się po stronie React/AuthProvider) |

Każda strona auth ustawia `export const prerender = false;` aby mieć dostęp do `import.meta.env`.

### 1.3 Formy, walidacje i UX

- **LoginForm**:
  - Pola: `email`, `password`.
  - Walidacja: `zod` (`email` jako e-mail, hasło wymagane).
  - Mutacja TanStack Query, call REST Supabase `/auth/v1/token?grant_type=password`. W przypadku sukcesu: `auth.login(token)` + toast + redirect `/generate`. Błędy (401, 429, 5xx) → `form.setError("root", ...)` + toast.
  - Link pod formularzem: „Nie masz konta? Zarejestruj się”.
- **RegisterForm**:
  - Pola: `email`, `password`, `confirmPassword`.
  - Walidacja: min. 6 znaków (zalecenie 8 w backlogu), `refine` na zgodność haseł.
  - Supabase `/auth/v1/signup`. Po sukcesie toast + redirect `/login`. Błędy 400/422/500 mapowane na polskie komunikaty.
  - Link: „Masz już konto? Zaloguj się”.
- **PasswordResetRequest** (część LoginForm):
  - Akcja typu link/przycisk na stronie `/login`.
  - Po kliknięciu uruchamia `supabase.auth.resetPasswordForEmail(email, { redirectTo: <PUBLIC_BASE_URL>/reset-password })`. Wymaga wypełnienia pola e-mail (walidacja jak w formularzu).
  - UI zawsze pokazuje komunikat „Jeśli adres istnieje...” aby uniknąć enumeracji kont. W razie błędu sieci – osobny toast.
- **ResetPasswordForm** (nowy):
  - Pola: `password`, `confirmPassword`.
  - Token resetu Supabase jest dostarczany w URL po kliknięciu w maila; strona odczytuje `token` z query (Astro) i przekazuje do React przez props. Brak tokenu → alert + link powrotny do `/login`.
  - Po walidacji: `supabase.auth.updateUser({ password })` z tokenem (Supabase automatycznie wstrzykuje). Udany reset → toast + redirect `/login`.
- **AuthProvider / globalne zachowanie**:
  - Przechowuje token w `sessionStorage`.
  - Udostępnia `login`, `logout`, `getToken`.
  - TanStack Query używa `getToken` do ustawiania nagłówka `Authorization`.
  - Przy starcie sprawdza token; brak → redirect `/login` (z `redirectTo`).

### 1.4 Obsługa scenariuszy

1. **Rejestracja nowego użytkownika** – `/register` → walidacja → Supabase → toast + `/login`.
2. **Logowanie** – `/login` → token → zapis w AuthProvider → redirect `/generate`.
3. **Żądanie resetu hasła** – użytkownik na `/login` wprowadza adres e-mail i wybiera „Resetuj hasło”. Aplikacja wysyła żądanie do Supabase, wyświetla komunikat i pozostaje na stronie logowania.
4. **Ustawienie nowego hasła** – użytkownik klika link z maila → `/reset-password?token=...` → nowe hasło → redirect `/login`.
5. **Wylogowanie** – przycisk w UI (np. w menu) wywołuje `auth.logout()` → czyści token + redirect `/login`. Opcjonalnie uderza w `/api/v1/auth/logout` (jeśli wprowadzimy).
6. **Sesja wygasła** – middleware / TanStack Query zobaczy 401, zainicjuje `auth.logout()` i pokaże toast „Sesja wygasła”.

Walidacje i błędy muszą być spójne językowo (PL, forma bezpośrednia). Loader blokuje przyciski podczas mutacji. Wszystkie formularze korzystają z Shadcn (`Card`, `Form`, `Input`, `Button`, `Alert`) oraz Sonner do toastów.

## 2. Logika backendowa

### 2.1 Integracja z Supabase

- Nie budujemy własnego systemu auth – wszystkie operacje idą przez Supabase Auth REST. Frontend korzysta z anonimowego klucza (`PUBLIC_SUPABASE_ANON_KEY`), backend (middleware/API) z `SUPABASE_KEY`.
- Middleware `src/middleware/index.ts` pozostaje odpowiedzialne za weryfikację tokena w API `/api/v1/*`. Jeśli token niepoprawny → `401`.
- Przy resetach hasła ustawiamy w Supabase `SITE_URL` (lub przekazujemy `redirectTo`) tak, by link prowadził do `/reset-password`.

### 2.2 Endpointy API (Astro)

Nie ma potrzeby tworzyć odrębnego REST dla login/register, natomiast rozważamy pomocniczy endpoint:

- **POST `/api/v1/auth/logout` (opcjonalny)**:
  - Wymaga nagłówka `Authorization`.
  - Middleware tworzy klienta Supabase z service role (lub używa `supabase.auth.admin.signOut(access_token)` jeśli dostępne).
  - Zwraca `204` po unieważnieniu refresh tokenu. UI wciąż kasuje token lokalnie.

Pozostałe istniejące endpointy `/api/v1` (sets, flashcards, ai) nie wymagają zmian – korzystają z obecnego mechanizmu autoryzacji.

### 2.3 Walidacja danych

- Frontend (React) – `zod` + `react-hook-form`.
- Backend (Astro API) – jeśli dodamy endpoint logout, należy walidować obecność nagłówka `Authorization` (400 gdy brak).
- Supabase – waliduje email (unikalność), hasło (polityki). Błędy zwracane JSON‑em mapujemy w UI.

### 2.4 Obsługa wyjątków

- Formularze: przechwytują `LoginError`/`RegisterError` itp., ustawiają `form.setError("root", ...)`, generują toasty. Sieć/offline → komunikat „Sprawdź połączenie”.
- Middleware/API: logują (docelowo logger; aktualnie `console.error`) i zwracają `401`/`500`.
- Reset hasła: UI nigdy nie ujawnia, czy email istnieje („Jeśli adres figuruje…”).

### 2.5 Renderowanie SSR

- Strony auth ustawiają `prerender = false` aby mieć dostęp do `import.meta.env` i obsłużyć query param (`token`).
- Pozostałe strony pozostają w aktualnym trybie hybrydowym (Static + Islands). AuthProvider w React decyduje o przekierowaniach klientowych.
- W razie potrzeby `astro.config.mjs` może zostać rozszerzone o `experimental.directRenderScript`, ale nie jest to wymagane w tej specyfikacji.

## 3. System autentykacji – szczegóły techniczne

### 3.1 Konfiguracja środowiska

- `.env` powinien zawierać obie pary zmiennych:
  ```
  SUPABASE_URL=...
  SUPABASE_KEY=...
  PUBLIC_SUPABASE_URL=${SUPABASE_URL}
  PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_KEY}
  ```
  Dzięki temu formularze React (bundle) mają dostęp do danych, a middleware/SSR korzystają z tych samych wartości. Prywatnych kluczy (service role) nie udostępniamy klientowi.

### 3.2 Przepływy

1. **Rejestracja** – `supabase.auth.signUp({ email, password })`. Opcjonalne włączenie email confirmations (konfiguracja Supabase).
2. **Logowanie** – `POST /auth/v1/token?grant_type=password` → `access_token` trafia do AuthProvider, zapisywany w `sessionStorage`. Autologout następuje po `expires_in` lub na żądanie.
3. **Wylogowanie** – `auth.logout()` usuwa token i czyści nagłówki. (Opcjonalny endpoint backendowy unieważnia refresh token.)
4. **Reset hasła**:
   - Etap 1: Na stronie `/login` użytkownik wybiera „Resetuj hasło”, co wywołuje `supabase.auth.resetPasswordForEmail(email, { redirectTo: .../reset-password })`.
   - Etap 2: link z maila otwiera `/reset-password?token=...`. Komponent React odczytuje token (Supabase automatycznie ustawia `#access_token` – obsługujemy zarówno query, jak i hash) i wywołuje `supabase.auth.updateUser({ password })`.
   - Po sukcesie użytkownik loguje się ponownie.

### 3.3 Bezpieczeństwo i UX

- Tokeny przechowywane w `sessionStorage` (nie w `localStorage`), aby ograniczyć trwałość.
- Każde żądanie API otrzymuje nagłówek `Authorization: Bearer <token>`.
- Middleware + RLS Supabase zapewniają, że użytkownik widzi tylko swoje dane.
- Brak informacji o istnieniu konta w resetach. Obsługa 429 (Too Many Attempts) – UI pokazuje komunikat, by spróbować później.
- W przyszłości można rozważyć `AuthGuard` w React do owijania stron (component-level) i `ProtectedRoute`.

## 4. Kroki implementacyjne (high-level)

1. Dodać brakującą stronę Astro `reset-password.astro` + komponent `ResetPasswordPage/Form`. Żądanie resetu realizować w `LoginForm` (bez osobnej strony). Wszystkie widoki auth korzystają z `AuthLayout` i `client:load`.
2. Uporządkować `AuthProvider` i `useAuth` – upewnić się, że token jest przekazywany do TanStack Query i, w razie jego braku, następuje przekierowanie na `/login`.
3. W komponentach auth używać zmiennych środowiskowych (`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`). Żadnych hardkodów kluczy.
4. (Opcjonalnie) dodać endpoint `/api/v1/auth/logout`. Jeśli będzie implementowany, wymaga service role key i oddzielnego klienta Supabase po stronie Astro.
5. Dodać testy e2e (np. Playwright lub ps1 testy w `.ai/test/api`) pokrywające rejestrację, logowanie, reset hasła.

## 5. Konsekwencje dla istniejącego systemu

- Obecne widoki (`/generate`, `/sets`, `/dashboard`) nadal działają, bo AuthProvider przechowuje token tak jak dotąd.
- Middleware już działa poprawnie z Supabase – nie wymaga zmian poza ewentualnym dodaniem endpointu logout.
- Dokumentacja (`.ai/ui-plan.md`) została wcześniej rozszerzona o widok rejestracji; po wdrożeniu resetu i obsługi wylogowania należy dopisać odpowiednie sekcje.
- Żadne istniejące API nie są modyfikowane; spec jedynie definiuje sposób użycia Supabase Auth i strukturę nowych widoków UI.

---

Ta specyfikacja stanowi źródło prawdy dla implementacji modułu auth i pozostaje zgodna z aktualnymi wymaganiami produktu oraz architekturą technologiczną projektu.