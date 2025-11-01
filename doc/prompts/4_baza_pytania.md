<pytania>
Czy fiszki powinny być powiązane tylko z jednym użytkownikiem czy mogą być współdzielone między użytkownikami w ramach zestawów?
Rekomendacja: Fiszki powinny być powiązane z użytkownikami poprzez zestawy, ponieważ każdy użytkownik ma swoje własne kolekcje fiszek, ale rozważ możliwość współdzielenia zestawów w przyszłości.
Jak powinna wyglądać struktura tabel dla spaced repetition - czy potrzebujemy osobnej tabeli dla harmonogramu powtórek każdej fiszki?
Rekomendacja: Tak, potrzebujemy tabeli scheduling z polami jak next_review_date, interval, ease_factor dla każdej fiszki użytkownika, aby śledzić postęp nauki.
Czy oceny jakości fiszek (thumbs up/down) powinny być przechowywane w osobnej tabeli czy jako pole w tabeli fiszek?
Rekomendacja: W osobnej tabeli flashcard_ratings z foreign key do użytkownika i fiszki, ponieważ wiele użytkowników może oceniać tę samą fiszkę AI.
Jakie typy danych powinny być użyte dla zawartości fiszek - text czy varchar z limitem znaków?
Rekomendacja: Użyć typu text dla awersu i rewersu fiszek, ponieważ limit 200 znaków na stronę jest wymogiem biznesowym, nie technicznym, a text jest bardziej elastyczny.
Czy zestawy fiszek powinny mieć relację wiele-do-wielu z fiszkami czy jeden-do-wielu?
Rekomendacja: Jeden-do-wielu, ponieważ każda fiszka należy do jednego zestawu, co upraszcza zarządzanie i unikamy złożonych relacji wiele-do-wielu w MVP.
Jak zaimplementować RLS dla fiszek - czy użytkownicy powinni widzieć tylko swoje fiszki?
Rekomendacja: Tak, wszystkie tabele z fiszkami powinny mieć RLS włączone z politykami pozwalającymi użytkownikom na dostęp tylko do swoich danych poprzez user_id.
Czy potrzebujemy indeksów na polach używanych w wyszukiwaniu fiszek (np. po zestawie, po użytkowniku)?
Rekomendacja: Tak, indeksy na user_id, flashcard_set_id oraz ewentualnie na next_review_date dla optymalizacji zapytań sesji nauki.
Jak obsłużyć usuwanie fiszek - soft delete czy hard delete?
Rekomendacja: Soft delete z polem deleted_at, ponieważ użytkownicy mogą przypadkowo usunąć fiszki i chcieć je przywrócić, a także dla analizy danych.
Czy tekst źródłowy używany do generowania fiszek przez AI powinien być przechowywany?
Rekomendacja: Tak, w tabeli generation_sessions lub jako pole w flashcard_sets, aby móc analizować jakość generowania i ewentualnie regenerować fiszki.
Jak skalować tabele z ocenami fiszek - czy partycjonowanie po czasie utworzenia ma sens?
Rekomendacja: Dla MVP nie jest potrzebne, ale rozważ partycjonowanie tabeli ratings po miesiącach jeśli oczekujemy dużej ilości danych z czasem.
</pytania>