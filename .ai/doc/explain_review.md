# Wyjaśnienie Systemu Powtórek (Review)

Ten dokument wyjaśnia, jak działa mechanizm powtórek fiszek w aplikacji, oparty na algorytmie SM-2.

## 1. Cel Systemu Powtórek

System powtórek ma na celu optymalizację nauki poprzez inteligentne planowanie, kiedy należy powtórzyć daną fiszkę. Zamiast uczyć się wszystkiego naraz, system pokazuje Ci materiał w odpowiednich odstępach czasu – tuż przed tym, jak zaczniesz go zapominać. Metoda ta, znana jako **Spaced Repetition**, jest zaimplementowana za pomocą **algorytmu SM-2**.

## 2. Struktura Bazy Danych

Sercem systemu jest tabela `learning_schedules`. Każdy wiersz w tej tabeli reprezentuje harmonogram nauki dla jednej fiszki i jednego użytkownika.

Kluczowe kolumny to:
- `flashcard_id`: ID fiszki, której dotyczy harmonogram.
- `user_id`: ID użytkownika.
- `next_review_date`: Data, kiedy fiszka powinna zostać ponownie wyświetlona.
- `interval`: Liczba dni do następnej powtórki po pomyślnym zaliczeniu.
- `repetitions`: Liczba udanych, następujących po sobie powtórek.
- `ease_factor`: "Współczynnik łatwości" (domyślnie 2.5), który określa, jak szybko rośnie interwał. Im wyższy, tym rzadziej fiszka będzie się pojawiać.

## 3. Jak to działa od strony użytkownika?

Podczas sesji nauki, aplikacja pokazuje Ci fiszki, których `next_review_date` jest dzisiaj lub w przeszłości.

1.  Widzisz pytanie (`front` fiszki).
2.  Myślisz nad odpowiedzią.
3.  Odsłaniasz odpowiedź (`back` fiszki).
4.  Porównujesz swoją odpowiedź z prawidłową i **oceniasz jakość swojej odpowiedzi** w skali od 0 do 5.

Ta ocena jest kluczowa i ma następujące znaczenie:

- **5**: "Perfekcyjnie". Odpowiedziałeś bez wahania.
- **4**: "Dobrze". Odpowiedziałeś poprawnie, ale z lekkim wahaniem.
- **3**: "Trudno". Odpowiedziałeś poprawnie, ale z dużym wysiłkiem.
- **2**: "Źle". Odpowiedź była błędna, ale po zobaczeniu prawidłowej, przypomniałeś sobie, że ją znałeś.
- **1**: "Bardzo źle". Odpowiedź była błędna, a prawidłowa odpowiedź była dla Ciebie nowością.
- **0**: "Pustka w głowie". Totalnie nie wiedziałeś.

## 4. Jak działa algorytm SM-2 (Backend)?

Twoja ocena (`quality`) jest wysyłana do serwera i staje się głównym parametrem wejściowym dla algorytmu SM-2, który aktualizuje harmonogram fiszki.

#### Scenariusz 1: Odpowiedź Prawidłowa (`quality` >= 3)

Jeśli oceniłeś swoją odpowiedź na 3, 4 lub 5, system uznaje to za sukces.
1.  **`repetitions`** zwiększa się o 1.
2.  **`ease_factor`** jest delikatnie modyfikowany.
    - Ocena `5` nieznacznie go podnosi (fiszka stanie się "łatwiejsza").
    - Ocena `4` pozostawia go bez zmian.
    - Ocena `3` nieznacznie go obniża (fiszka stanie się "trudniejsza").
3.  **`interval`** (odstęp do następnej powtórki) jest obliczany na nowo:
    - Przy pierwszej udanej powtórce (`repetitions = 1`), `interval` wynosi **1 dzień**.
    - Przy drugiej (`repetitions = 2`), `interval` wynosi **6 dni**.
    - Przy trzeciej i kolejnych, `interval` jest mnożony przez `ease_factor` (np. `nowy_interval = stary_interval * ease_factor`).
4.  **`next_review_date`** jest ustawiana na `dziś + nowy_interval`.

#### Scenariusz 2: Odpowiedź Błędna (`quality` < 3)

Jeśli ocena to 0, 1 lub 2, odpowiedź jest błędna.
1.  **`repetitions`** jest zerowane (`0`). Traktujemy to tak, jakbyś uczył się fiszki od nowa.
2.  **`interval`** jest resetowany do **1 dnia**. Fiszka na pewno pojawi się w jutrzejszej sesji.
3.  **`ease_factor`** pozostaje bez zmian.

## 5. Symulacja: Cykl życia jednej fiszki

Załóżmy, że uczysz się nowej fiszki. Jej początkowy stan to: `repetitions: 0`, `interval: 0`, `ease_factor: 2.5`.

| Krok | Akcja Użytkownika | Stan PRZED | Obliczenia Algorytmu (SM-2) | Stan PO | Notatki |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Ocena: 4 (Dobrze)** | `rep: 0`, `int: 0`, `EF: 2.5` | Prawidłowa odp. `rep` -> 1. `int` -> 1. | `rep: 1`, `int: 1`, `EF: 2.5` | Fiszka pojawi się **jutro**. |
| **2** | **Ocena: 5 (Perfekcyjnie)** | `rep: 1`, `int: 1`, `EF: 2.5` | Prawidłowa odp. `rep` -> 2. `int` -> 6. `EF` -> 2.6. | `rep: 2`, `int: 6`, `EF: 2.6` | Fiszka pojawi się za **6 dni**. |
| **3** | **Ocena: 2 (Źle)** | `rep: 2`, `int: 6`, `EF: 2.6` | Błędna odp. `rep` -> 0. `int` -> 1. | `rep: 0`, `int: 1`, `EF: 2.6` | **Zapomniałeś!** Fiszka pojawi się **jutro**. |
| **4** | **Ocena: 3 (Trudno)** | `rep: 0`, `int: 1`, `EF: 2.6` | Prawidłowa odp. `rep` -> 1. `int` -> 1. `EF` -> 2.46. | `rep: 1`, `int: 1`, `EF: 2.46` | Zaliczyłeś, ale z trudem. `EF` spadł. Fiszka pojawi się **jutro**. |
| **5** | **Ocena: 4 (Dobrze)** | `rep: 1`, `int: 1`, `EF: 2.46`| Prawidłowa odp. `rep` -> 2. `int` -> 6. | `rep: 2`, `int: 6`, `EF: 2.46`| Fiszka znów pojawi się za **6 dni**. |
| **6**| **Ocena: 4 (Dobrze)** | `rep: 2`, `int: 6`, `EF: 2.46`| Prawidłowa odp. `rep` -> 3. `int` -> 15 (`6 * 2.46`).|`rep: 3`, `int: 15`, `EF: 2.46`| Fiszka pojawi się za **15 dni**. |

Jak widać, system dynamicznie dostosowuje harmonogram. Fiszki, z którymi masz problem, pojawiają się częściej, a te, które dobrze znasz, są odsuwane w czasie, aby nie marnować Twojego czasu.
