# Plan implementacji widoku: Generator AI (Formularz)

## 1. Przegląd

Celem tego widoku jest dostarczenie użytkownikowi interfejsu do generowania fiszek za pomocą AI. Widok składa się z formularza, w którym użytkownik podaje nazwę dla nowego zestawu oraz wkleja tekst źródłowy. Po przesłaniu formularza, aplikacja komunikuje się z API w celu wygenerowania fiszek, a następnie przekierowuje użytkownika do widoku podglądu w celu ich weryfikacji i akceptacji.

## 2. Routing widoku

Widok będzie dostępny pod następującą ścieżką:
- **Ścieżka**: `/generate`

Implementacja zostanie umieszczona w pliku `src/pages/generate.astro`.

## 3. Struktura komponentów

Hierarchia komponentów dla tego widoku będzie następująca. Komponent `GeneratorAiForm` będzie komponentem React renderowanym po stronie klienta (`client:load`).

```
- src/pages/generate.astro
  - Layout
    - GeneratorAiForm (`client:load`)
      - Card (Shadcn)
        - CardHeader, CardTitle
        - CardContent
          - Form (Shadcn/react-hook-form)
            - FormField (dla `setName`)
              - FormItem, FormLabel, FormControl, FormMessage
              - Input (Shadcn)
            - FormField (dla `source_text`)
              - FormItem, FormLabel, FormControl, FormMessage
              - Textarea (Shadcn)
            - Button (Shadcn, z obsługą stanu ładowania)
```

## 4. Szczegóły komponentów

### `GeneratorAiForm.tsx`

- **Opis komponentu**: Główny komponent React, który zawiera całą logikę formularza, jego walidację oraz komunikację z API. Używa `react-hook-form` do zarządzania stanem formularza i `@tanstack/react-query` do obsługi mutacji (wywołania API).
- **Główne elementy**:
  - Komponent `Card` z `CardHeader` i `CardContent` do wizualnego opakowania formularza.
  - Komponent `Form` z `react-hook-form` i `zodResolver` do zarządzania formularzem i walidacją.
  - Dwa pola `FormField`: jedno z komponentem `Input` dla `setName`, drugie z `Textarea` dla `source_text`.
  - Komponent `Button` typu `submit`, który wyświetla stan ładowania (`isPending` z `useMutation`).
- **Obsługiwane interakcje**:
  - `onSubmit`: Po pomyślnej walidacji formularza, uruchamia mutację (wywołanie API) w celu wygenerowania fiszek.
- **Warunki walidacji**:
  - `setName`: Pole wymagane, nie może być puste (`min(1)`).
  - `source_text`: Pole wymagane, nie może być puste (`min(1)`).
- **Typy**:
  - `GenerateFlashcardsCommand` (dane formularza i żądanie API).
  - `GenerateFlashcardsResponseDto` (odpowiedź API).
- **Propsy**: Brak. Komponent jest samodzielny.

## 5. Typy

Do implementacji widoku wykorzystane zostaną istniejące typy z pliku `src/types.ts`. Nie ma potrzeby tworzenia nowych typów.

- **`GenerateFlashcardsCommand`**: Obiekt danych wysyłany do API. Odpowiada strukturze danych formularza.
  ```typescript
  export interface GenerateFlashcardsCommand {
    source_text: string;
    setName: string;
  }
  ```
- **`GenerateFlashcardsResponseDto`**: Obiekt danych otrzymywany z API po pomyślnym wygenerowaniu fiszek. Dane te zostaną zapisane w globalnym kontekście.
  ```typescript
  export interface GenerateFlashcardsResponseDto {
    temp_id: string;
    setName: string;
    source_text: string;
    flashcards: AiGeneratedFlashcard[];
  }
  ```

## 6. Zarządzanie stanem

- **Stan formularza**: Będzie zarządzany przez bibliotekę `react-hook-form` z resolverem `zod`. To obejmuje wartości pól, błędy walidacji oraz stan przesyłania.
- **Stan API**: Stan zapytania do API (ładowanie, błąd, sukces) będzie zarządzany przez `useMutation` z biblioteki `@tanstack/react-query`.
- **Stan globalny (między widokami)**: Zgodnie z `ui-plan.md`, wynik generowania fiszek (`GenerateFlashcardsResponseDto`) musi zostać przekazany do widoku podglądu (`/generate/preview`). Zostanie to zrealizowane za pomocą dedykowanego kontekstu React (`AiGenerationContext`). Po pomyślnej odpowiedzi z API, komponent `GeneratorAiForm` zapisze dane w tym kontekście, a następnie programistycznie przekieruje użytkownika.

## 7. Integracja API

- **Endpoint**: `POST /api/v1/ai/generate-flashcards`
- **Biblioteka**: Wykorzystany zostanie `fetch` opakowany w `useMutation` z `@tanstack/react-query`.
- **Typ żądania**: `GenerateFlashcardsCommand`
- **Typ odpowiedzi (sukces)**: `GenerateFlashcardsResponseDto`
- **Przepływ**:
  1. Użytkownik przesyła poprawnie wypełniony formularz.
  2. Uruchamiana jest funkcja `mutate` z `useMutation`, wysyłając dane formularza do endpointu.
  3. W trakcie zapytania (`isPending`), przycisk przesyłania jest nieaktywny i wyświetla wskaźnik ładowania.
  4. Po otrzymaniu odpowiedzi `200 OK`, dane (`GenerateFlashcardsResponseDto`) są zapisywane w `AiGenerationContext`, a użytkownik jest przekierowywany na `/generate/preview`.
  5. W przypadku błędu, użytkownikowi wyświetlany jest odpowiedni komunikat (Toast).

## 8. Interakcje użytkownika

- **Wprowadzanie danych**: Użytkownik wpisuje tekst w pola "Nazwa zestawu" i "Tekst źródłowy".
- **Przesłanie formularza**: Użytkownik klika przycisk "Generuj fiszki".
  - **Wynik (formularz niepoprawny)**: Przesłanie jest blokowane, a pod odpowiednimi polami wyświetlane są komunikaty o błędach walidacji.
  - **Wynik (formularz poprawny)**: Przycisk zostaje zablokowany, pojawia się animacja ładowania, a w tle wysyłane jest zapytanie do API. Po pomyślnym zakończeniu następuje przekierowanie. W razie błędu, przycisk wraca do stanu aktywnego, a użytkownik widzi powiadomienie o błędzie.

## 9. Warunki i walidacja

Walidacja po stronie klienta będzie lustrzanym odbiciem walidacji backendowej, aby zapewnić spójność i dobry UX.

- **Schemat walidacji (Zod)**:
  ```typescript
  const GenerateFlashcardsSchema = z.object({
    setName: z.string().min(1, "Nazwa zestawu jest wymagana."),
    source_text: z.string().min(1, "Tekst źródłowy jest wymagany."),
  });
  ```
- **Wpływ na interfejs**:
  - Jeśli pole jest niepoprawne po utracie fokusa lub próbie przesłania, pod polem pojawi się komunikat błędu zdefiniowany w schemacie.
  - Przycisk "Generuj fiszki" może być warunkowo nieaktywny, dopóki formularz nie będzie poprawny, lub walidacja może być uruchamiana dopiero przy próbie przesłania.

## 10. Obsługa błędów

Błędy będą komunikowane użytkownikowi za pomocą komponentu `Toast`.

- **Błędy walidacji**: Obsługiwane przez `react-hook-form` i wyświetlane bezpośrednio pod polami formularza.
- **Błąd 401 Unauthorized**: Sesja użytkownika wygasła. Globalny handler zapytań powinien przechwycić ten błąd i przekierować użytkownika do strony logowania.
- **Błąd 429 Too Many Requests**: Wyświetlony zostanie toast z informacją: "Wykryto zbyt wiele prób. Spróbuj ponownie za chwilę." (opcjonalnie z czasem z nagłówka `Retry-After`).
- **Błąd 500 Internal Server Error**: Wyświetlony zostanie ogólny toast: "Wystąpił błąd po stronie serwera. Prosimy spróbować ponownie później."
- **Błąd sieciowy**: Wyświetlony zostanie toast: "Błąd połączenia sieciowego. Sprawdź swoje połączenie i spróbuj ponownie."

## 11. Kroki implementacji

1.  **Stworzenie pliku strony**: Utworzyć plik `src/pages/generate.astro`. Wewnątrz umieścić podstawowy layout strony.
2.  **Stworzenie komponentu formularza**: Utworzyć plik `src/components/feature/ai/GeneratorAiForm.tsx`.
3.  **Implementacja struktury formularza**: W `GeneratorAiForm.tsx` użyć komponentów Shadcn (`Card`, `Form`, `Input`, `Textarea`, `Button`) do zbudowania wizualnej struktury formularza.
4.  **Podłączenie `react-hook-form`**: Zainicjować `useForm` z resolverem Zod (`zodResolver`) i schematem walidacji zdefiniowanym w sekcji 9. Połączyć hook z komponentami formularza.
5.  **Implementacja `AiGenerationContext`**: Stworzyć kontekst, który będzie przechowywał `GenerateFlashcardsResponseDto` oraz funkcję do jego aktualizacji.
6.  **Implementacja mutacji API**: W `GeneratorAiForm.tsx` użyć hooka `useMutation` z `@tanstack/react-query` do zdefiniowania logiki wysyłania danych do `POST /api/v1/ai/generate-flashcards`.
7.  **Obsługa stanu ładowania i błędów**: Połączyć stan `isPending` z `useMutation` z przyciskiem, aby pokazywać animację ładowania. W `onError` zaimplementować wyświetlanie toastów z błędami.
8.  **Obsługa sukcesu i przekierowania**: W `onSuccess` z `useMutation` wywołać funkcję z `AiGenerationContext` w celu zapisania wyniku, a następnie użyć `navigate` z Astro do przekierowania użytkownika na `/generate/preview`.
9.  **Integracja z Astro**: Umieścić komponent `<GeneratorAiForm client:load />` na stronie `generate.astro`. Upewnić się, że strona jest opakowana w `AiGenerationProvider`.
10. **Testowanie**: Przetestować wszystkie ścieżki: pomyślne generowanie, błędy walidacji, błędy serwera (4xx, 5xx) oraz błąd sieciowy.
