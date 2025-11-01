# API Endpoint Implementation Plan: GET /api/v1/profiles/me

## 1. Przegląd punktu końcowego
Ten punkt końcowy służy do pobierania danych profilowych aktualnie uwierzytelnionego użytkownika. Zwraca publiczne informacje o użytkowniku, takie jak nazwa użytkownika, URL awatara i ustawienia powiadomień.

## 2. Szczegóły żądania
- **Metoda HTTP**: `GET`
- **Struktura URL**: `/api/v1/profiles/me`
- **Parametry**:
  - **Wymagane**: Brak.
  - **Opcjonalne**: Brak.
- **Request Body**: Brak.

## 3. Wykorzystywane typy
- **DTOs**:
  - `ProfileDto`: Obiekt odpowiedzi zawierający dane profilu użytkownika, mapowany bezpośrednio z tabeli `profiles`.
- **Command Modele**: Brak.

## 4. Szczegóły odpowiedzi
- **Sukces (`200 OK`)**: Zwraca obiekt `ProfileDto`.
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
  - `401 Unauthorized`: Użytkownik nie jest zalogowany (brak lub nieprawidłowy token JWT).
  - `404 Not Found`: Użytkownik jest uwierzytelniony, ale jego profil nie został znaleziony w tabeli `profiles`.
  - `500 Internal Server Error`: Wystąpił nieoczekiwany błąd serwera.

## 5. Przepływ danych
1.  Żądanie `GET` trafia do punktu końcowego Astro (`/src/pages/api/v1/profiles/me.ts`).
2.  Middleware Astro (`/src/middleware/index.ts`) weryfikuje token JWT. Jeśli jest nieprawidłowy, zwraca `401 Unauthorized`.
3.  Wywoływana jest funkcja `getProfile` z nowego serwisu `src/lib/services/profileService.ts`.
4.  Serwis wykonuje zapytanie do bazy danych Supabase, aby pobrać profil użytkownika z tabeli `profiles`.
5.  Polityka RLS (Row-Level Security) w Supabase zapewnia, że zapytanie zwróci profil tylko dla zalogowanego użytkownika (`auth.uid() = id`).
6.  Serwis mapuje wynik z bazy danych na `ProfileDto` i zwraca go do punktu końcowego.
7.  Punkt końcowy serializuje DTO do formatu JSON i wysyła odpowiedź `200 OK`.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie**: Żądania muszą zawierać prawidłowy token JWT, który jest weryfikowany przez middleware.
- **Autoryzacja**: Dostęp do danych jest kontrolowany na poziomie bazy danych przez politykę RLS: `"Users can view their own profile." on profiles for select using (auth.uid() = id)`. Gwarantuje to, że użytkownik może pobrać tylko własny profil.

## 7. Obsługa błędów
- **Brak uwierzytelnienia (`401 Unauthorized`)**: Obsługiwane globalnie przez middleware.
- **Nie znaleziono profilu (`404 Not Found`)**: Gdy zapytanie do bazy danych nie zwróci żadnych wyników dla danego `user.id`. Może to wskazywać na problem z synchronizacją między `auth.users` a `profiles`.
- **Błąd serwera (`500 Internal Server Error`)**: W przypadku problemów z połączeniem do bazy danych lub innych nieoczekiwanych błędów. Błąd powinien zostać zarejestrowany w tabeli `system_logs` z typem `DB_FETCH_ERROR` i metadanymi zawierającymi `userId`.

## 8. Rozważania dotyczące wydajności
- Zapytanie do tabeli `profiles` odbywa się po kluczu głównym (`id`), co jest wysoce zoptymalizowane i nie powinno stanowić wąskiego gardła wydajnościowego.
- Nie przewiduje się problemów z wydajnością dla tego punktu końcowego.

## 9. Etapy wdrożenia
1.  **Utworzenie pliku serwisu**: Stwórz plik `src/lib/services/profileService.ts`.
2.  **Implementacja logiki serwisu**:
    - Dodaj funkcję `getProfile(supabase: SupabaseClient): Promise<ProfileDto | null>`.
    - Wewnątrz funkcji zaimplementuj zapytanie Supabase do tabeli `profiles` w celu pobrania profilu bieżącego użytkownika.
3.  **Utworzenie pliku punktu końcowego**: Stwórz plik `src/pages/api/v1/profiles/me.ts`.
4.  **Implementacja logiki punktu końcowego**:
    - Zdefiniuj `export const prerender = false;`.
    - Zaimplementuj handler `GET({ locals })`.
    - Pobierz klienta Supabase z `locals.supabase`.
    - Wywołaj `getProfile` z serwisu.
    - Jeśli wynik jest `null`, zwróć odpowiedź `404`.
    - W przypadku błędu, zaloguj go i zwróć `500`.
    - Jeśli operacja się powiedzie, zwróć odpowiedź `200` z danymi profilu.
5.  **Testowanie**: Przygotuj testy jednostkowe dla serwisu i integracyjne dla punktu końcowego, aby zweryfikować scenariusze sukcesu i błędów.

