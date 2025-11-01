# API Endpoint Implementation Plan: PATCH /api/v1/profiles/me

## 1. Przegląd punktu końcowego
Ten punkt końcowy umożliwia uwierzytelnionemu użytkownikowi aktualizację swojego profilu publicznego. Pozwala na zmianę nazwy użytkownika, adresu URL awatara oraz preferencji dotyczących powiadomień.

## 2. Szczegóły żądania
- **Metoda HTTP**: `PATCH`
- **Struktura URL**: `/api/v1/profiles/me`
- **Parametry**:
  - **Wymagane**: Brak.
  - **Opcjonalne**: Brak.
- **Request Body**: Obiekt JSON z polami do aktualizacji. Wszystkie pola są opcjonalne.
  ```json
  {
    "username": "string (optional, min: 3)",
    "avatar_url": "string (optional)",
    "notification_enabled": "boolean (optional)"
  }
  ```

## 3. Wykorzystywane typy
- **DTOs**:
  - `ProfileDto`: Zwracany jako odpowiedź po pomyślnej aktualizacji.
- **Command Modele**:
  - `UpdateProfileCommand`: Reprezentuje dane wejściowe do aktualizacji profilu.
- **Walidacja**:
  - Schemat Zod do walidacji `UpdateProfileCommand`.

## 4. Szczegóły odpowiedzi
- **Sukces (`200 OK`)**: Zwraca zaktualizowany obiekt `ProfileDto`.
  ```json
  {
    "id": "uuid",
    "username": "string",
    "avatar_url": "string | null",
    "notification_enabled": "boolean",
    "updated_at": "string<date-time>"
  }
  ```
- **Błędy**:
  - `400 Bad Request`: Nieprawidłowe dane wejściowe (np. nazwa użytkownika za krótka).
  - `401 Unauthorized`: Użytkownik nie jest zalogowany.
  - `404 Not Found`: Profil użytkownika nie istnieje.
  - `409 Conflict`: Wybrana nazwa użytkownika jest już zajęta.
  - `500 Internal Server Error`: Wystąpił nieoczekiwany błąd serwera.

## 5. Przepływ danych
1.  Żądanie `PATCH` trafia do punktu końcowego Astro (`/src/pages/api/v1/profiles/me.ts`).
2.  Middleware Astro (`/src/middleware/index.ts`) weryfikuje token JWT.
3.  Punkt końcowy odczytuje i waliduje ciało żądania za pomocą schematu Zod dla `UpdateProfileCommand`. W przypadku błędu walidacji zwraca `400 Bad Request`.
4.  Wywoływana jest funkcja `updateProfile` z serwisu `src/lib/services/profileService.ts`.
5.  Serwis `updateProfile` wykonuje zapytanie `update()` do tabeli `profiles` w Supabase, używając danych z `UpdateProfileCommand`.
6.  Polityka RLS (`"Users can update their own profile."`) w Supabase zapewnia, że użytkownik może modyfikować tylko swój własny profil.
7.  Zapytanie `update` jest połączone z `.select().single()` w celu atomowego zwrócenia zaktualizowanego wiersza.
8.  Serwis obsługuje potencjalne błędy z bazy danych, w szczególności naruszenie unikalności (`username`), i mapuje je na odpowiednie błędy HTTP.
9.  Punkt końcowy otrzymuje zaktualizowany `ProfileDto` i wysyła go w odpowiedzi `200 OK`.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie**: Weryfikacja tokenu JWT w middleware jest obowiązkowa.
- **Autoryzacja**: Polityka RLS w bazie danych jest kluczowym mechanizmem zabezpieczającym, uniemożliwiającym modyfikację cudzych profili.
- **Walidacja danych wejściowych**: Użycie Zod do walidacji danych wejściowych chroni przed nieprawidłowymi danymi i potencjalnymi atakami (np. XSS, jeśli dane byłyby bezpośrednio renderowane). Należy upewnić się, że `avatar_url` jest poprawnym adresem URL.
- **Obsługa błędów**: Należy unikać zwracania szczegółowych błędów bazy danych do klienta. Błąd naruszenia unikalności `username` jest wyjątkiem i powinien być jasno zakomunikowany jako `409 Conflict`.

## 7. Obsługa błędów
- **Nieprawidłowe dane (`400 Bad Request`)**: Obsługiwane przez walidację Zod.
- **Brak uwierzytelnienia (`401 Unauthorized`)**: Obsługiwane przez middleware.
- **Profil nie istnieje (`404 Not Found`)**: Gdy operacja `update` nie znajduje pasującego rekordu.
- **Nazwa użytkownika zajęta (`409 Conflict`)**: Gdy baza danych zwróci błąd naruszenia unikalnego klucza dla kolumny `username` (PostgREST error `23505`).
- **Błąd serwera (`500 Internal Server Error`)**: W przypadku innych błędów bazy danych. Błąd powinien zostać zarejestrowany w tabeli `system_logs` z typem `DB_UPDATE_ERROR`.

## 8. Rozważania dotyczące wydajności
- Operacja `update` na kluczu głównym jest wydajna.
- Sprawdzanie unikalności nazwy użytkownika opiera się na indeksie `unique`, więc również jest szybkie.
- Nie przewiduje się problemów z wydajnością.

## 9. Etapy wdrożenia
1.  **Aktualizacja serwisu**: W pliku `src/lib/services/profileService.ts` dodaj nową funkcję:
    - `updateProfile(supabase: SupabaseClient, command: UpdateProfileCommand): Promise<{ data: ProfileDto | null; error: any }>`.
    - Funkcja powinna pobrać ID użytkownika i wykonać zapytanie `update` w Supabase, zwracając zarówno dane, jak i potencjalny błąd.
2.  **Aktualizacja pliku punktu końcowego**: W pliku `src/pages/api/v1/profiles/me.ts` dodaj handler dla metody `PATCH`.
3.  **Implementacja logiki handlera `PATCH`**:
    - Zdefiniuj schemat Zod dla `UpdateProfileCommand`.
    - Zwaliduj ciało żądania. W razie błędu zwróć `400`.
    - Wywołaj `profileService.updateProfile`.
    - Obsłuż błąd (np. sprawdzając `error.code === '23505'` i zwracając `409`).
    - Jeśli dane są `null`, zwróć `404`.
    - W razie sukcesu zwróć `200` ze zaktualizowanym profilem.
4.  **Testowanie**: Dodaj testy dla serwisu i punktu końcowego, obejmujące:
    - Pomyślną aktualizację.
    - Próbę aktualizacji z nieprawidłowymi danymi.
    - Próbę ustawienia zajętej nazwy użytkownika.
    - Próbę aktualizacji bez uwierzytelnienia.
