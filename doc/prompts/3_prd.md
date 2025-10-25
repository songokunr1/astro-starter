Jesteś doświadczonym menedżerem produktu, którego zadaniem jest stworzenie kompleksowego dokumentu wymagań produktu (PRD) w oparciu o poniższe opisy:

<project_description>
### Główny problem
Manualne tworzenie wysokiej jakości fiszek edukacyjnych jest czasochłonne, co zniechęca do korzystania z efektywnej metody nauki jaką jest spaced repetition.

### Najmniejszy zestaw funkcjonalności
- Generowanie fiszek przez AI na podstawie wprowadzonego tekstu (kopiuj-wklej)
- Manualne tworzenie fiszek
- Przeglądanie, edycja i usuwanie fiszek
- Prosty system kont użytkowników do przechowywania fiszek
- Integracja fiszek z gotowym algorytmem powtórek

### Co NIE wchodzi w zakres MVP
- Własny, zaawansowany algorytm powtórek (jak SuperMemo, Anki)
- Import wielu formatów (PDF, DOCX, itp.)
- Współdzielenie zestawów fiszek między użytkownikami
- Integracje z innymi platformami edukacyjnymi
- Aplikacje mobilne (na początek tylko web)

### Kryteria sukcesu
- 75% fiszek wygenerowanych przez AI jest akceptowane przez użytkownika
- Użytkownicy tworzą 75% fiszek z wykorzystaniem AI</project_description>

<project_details>
<conversation_summary>
<decisions>
1. Głównymi frustracjami użytkowników, które produkt ma rozwiązać, są czasochłonność, trudność, złożoność i szybkość tworzenia fiszek na dany temat.
2. Początkowo aplikacja skupi się na nauce angielskiego, ale docelowo ma być uniwersalna dla różnych typów treści.
3. Interfejs użytkownika do zarządzania fiszkami będzie balansował między szybkością (szybka akceptacja/odrzucenie całych zestawów) a kontrolą (szczegółowa edycja pojedynczych fiszek).
4. Kryteria sukcesu będą mierzone poprzez ogólne metryki, takie jak w pełni zaakceptowane fiszki, odrzucone fiszki i edytowane fiszki, oprócz początkowo zdefiniowanych (75% akceptacji AI, 75% tworzenia fiszek przez AI).
5. Wybór gotowego algorytmu powtórek powinien priorytetowo traktować łatwość integracji, elastyczność API i stabilność, aby zminimalizować ryzyko techniczne dla MVP.
6. MVP będzie zbudowane z wykorzystaniem minimalistycznego podejścia do frontendu, backendu i Supabase.
7. Zostanie zaimplementowany system zbierania opinii użytkowników (np. "kciuk w górę/w dół") na temat jakości generowanych fiszek, aby sukcesywnie ulepszać model AI.
8. Długie teksty wejściowe dla AI będą dzielone na wiele fiszek, z maksymalnym limitem 200 znaków na stronę (przód/tył) każdej fiszki.
9. Decyzja o priorytetowym formacie importu dla przyszłych etapów rozwoju jest odroczona.
10. System dla MVP jest projektowany dla kilku użytkowników, a obecny stos technologiczny (Astro, React, Supabase) jest uważany za wystarczający do obsługi tego obciążenia.
</decisions>

<matched_recommendations>
1. Rekomendacja (z pytania 3): Zaprojektuj interfejs użytkownika do zarządzania fiszkami, który równoważy szybkość z kontrolą, być może oferując opcje szybkiej akceptacji dla dobrze wygenerowanych zestawów i narzędzia do szybkiej edycji dla pojedynczych fiszek.
2. Rekomendacja (z pytania 5): Przeprowadź analizę dostępnych algorytmów powtórek pod kątem łatwości integracji, elastyczności API i stabilności, wybierając ten, który minimalizuje ryzyko techniczne dla MVP.
3. Rekomendacja (z pytania 7): Zaimplementuj system zbierania opinii użytkowników na temat jakości generowanych fiszek (np. prosty system "kciuk w górę/w dół"), aby sukcesywnie ulepszać model AI i zwiększyć wskaźnik akceptacji.
</matched_recommendations>

<prd_planning_summary>
Produkt ma na celu rozwiązanie problemu czasochłonnego manualnego tworzenia fiszek, ułatwiając i przyspieszając ten proces. MVP będzie koncentrować się na generowaniu fiszek przez AI z wprowadzonego tekstu (kopiuj-wklej), manualnym tworzeniu fiszek, przeglądaniu, edycji i usuwaniu fiszek, prostym systemie kont użytkowników oraz integracji z gotowym algorytmem powtórek.

Kluczowe historie użytkownika obejmują: generowanie fiszek przez AI z wklejonego tekstu, ręczne tworzenie fiszek, zarządzanie fiszkami (przeglądanie, edycja, usuwanie) z równowagą między szybkością a kontrolą (szybka akceptacja/odrzucenie zestawów, detaliczna edycja), przechowywanie fiszek w ramach konta użytkownika oraz naukę z wykorzystaniem zintegrowanego algorytmu powtórek. Produkt początkowo skupi się na nauce języka angielskiego, ale docelowo ma być uniwersalny.

Kryteria sukcesu MVP obejmują: 75% akceptacji fiszek generowanych przez AI oraz 75% tworzenia fiszek z wykorzystaniem AI. Dodatkowe metryki do śledzenia to liczba w pełni zaakceptowanych, odrzuconych i edytowanych fiszek. W celu usprawnienia AI zostanie wdrożony system zbierania opinii użytkowników na temat jakości generowanych fiszek (np. kciuk w górę/w dół). W przypadku długiego tekstu wejściowego, AI będzie dzielić go na wiele fiszek, z limitem 200 znaków na każdą stronę fiszki.

Projekt będzie wykorzystywał minimalistyczny stos technologiczny oparty na frontendzie, backendzie i Supabase, który jest uważany za wystarczający dla początkowego, niewielkiego obciążenia systemu (kilka osób).
</prd_planning_summary>

<unresolved_issues>
1.  Brak doprecyzowania dodatkowych metryk sukcesu związanych z zaangażowaniem użytkowników, takich jak retencja użytkowników, liczba ukończonych sesji powtórek czy średnia liczba fiszek na użytkownika.
2.  Brak wybranego konkretnego gotowego algorytmu powtówek; wymagana jest dalsza analiza i wybór zgodnie z określonymi kryteriami (łatwość integracji, elastyczność API, stabilność).
3.  Brak szczegółów dotyczących implementacji "prostego systemu kont użytkowników" (np. konkretne metody logowania, funkcje zarządzania profilem).
</unresolved_issues>
</conversation_summary>
</project_details>

Wykonaj następujące kroki, aby stworzyć kompleksowy i dobrze zorganizowany dokument:

1. Podziel PRD na następujące sekcje:
   a. Przegląd projektu
   b. Problem użytkownika
   c. Wymagania funkcjonalne
   d. Granice projektu
   e. Historie użytkownika
   f. Metryki sukcesu

2. W każdej sekcji należy podać szczegółowe i istotne informacje w oparciu o opis projektu i odpowiedzi na pytania wyjaśniające. Upewnij się, że:
   - Używasz jasnego i zwięzłego języka
   - W razie potrzeby podajesz konkretne szczegóły i dane
   - Zachowujesz spójność w całym dokumencie
   - Odnosisz się do wszystkich punktów wymienionych w każdej sekcji

3. Podczas tworzenia historyjek użytkownika i kryteriów akceptacji
   - Wymień WSZYSTKIE niezbędne historyjki użytkownika, w tym scenariusze podstawowe, alternatywne i skrajne.
   - Przypisz unikalny identyfikator wymagań (np. US-001) do każdej historyjki użytkownika w celu bezpośredniej identyfikowalności.
   - Uwzględnij co najmniej jedną historię użytkownika specjalnie dla bezpiecznego dostępu lub uwierzytelniania, jeśli aplikacja wymaga identyfikacji użytkownika lub ograniczeń dostępu.
   - Upewnij się, że żadna potencjalna interakcja użytkownika nie została pominięta.
   - Upewnij się, że każda historia użytkownika jest testowalna.

Użyj następującej struktury dla każdej historii użytkownika:
- ID
- Tytuł
- Opis
- Kryteria akceptacji

4. Po ukończeniu PRD przejrzyj go pod kątem tej listy kontrolnej:
   - Czy każdą historię użytkownika można przetestować?
   - Czy kryteria akceptacji są jasne i konkretne?
   - Czy mamy wystarczająco dużo historyjek użytkownika, aby zbudować w pełni funkcjonalną aplikację?
   - Czy uwzględniliśmy wymagania dotyczące uwierzytelniania i autoryzacji (jeśli dotyczy)?

5. Formatowanie PRD:
   - Zachowaj spójne formatowanie i numerację.
   - Nie używaj pogrubionego formatowania w markdown ( ** ).
   - Wymień WSZYSTKIE historyjki użytkownika.
   - Sformatuj PRD w poprawnym markdown.

Przygotuj PRD z następującą strukturą:

```markdown
# Dokument wymagań produktu (PRD) - {{app-name}}
## 1. Przegląd produktu
## 2. Problem użytkownika
## 3. Wymagania funkcjonalne
## 4. Granice produktu
## 5. Historyjki użytkowników
## 6. Metryki sukcesu
```

Pamiętaj, aby wypełnić każdą sekcję szczegółowymi, istotnymi informacjami w oparciu o opis projektu i nasze pytania wyjaśniające. Upewnij się, że PRD jest wyczerpujący, jasny i zawiera wszystkie istotne informacje potrzebne do dalszej pracy nad produktem.

Ostateczny wynik powinien składać się wyłącznie z PRD zgodnego ze wskazanym formatem w markdown, który zapiszesz w pliku .ai/prd.md