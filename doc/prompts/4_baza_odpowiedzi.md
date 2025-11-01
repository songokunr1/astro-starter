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
<odpowiedzi>
1) na poczatek powiazane z jedyn uzytkownikiem. ale w przyszlosci bedziemy chcieli moc dzielic się (share). na razie skupimy sie na MVP, bez dzielenia
2) Rekomendacja: Tak, potrzebujemy tabeli scheduling z polami jak next_review_date, interval, ease_factor dla każdej fiszki użytkownika, aby śledzić postęp nauki.
3) Rekomendacja: W osobnej tabeli flashcard_ratings z foreign key do użytkownika i fiszki, ponieważ wiele użytkowników może oceniać tę samą fiszkę AI.
4) Rekomendacja: Użyć typu text dla awersu i rewersu fiszek, ponieważ limit 200 znaków na stronę jest wymogiem biznesowym, nie technicznym, a text jest bardziej elastyczny.
5) Rekomendacja: Jeden-do-wielu, ponieważ każda fiszka należy do jednego zestawu, co upraszcza zarządzanie i unikamy złożonych relacji wiele-do-wielu w MVP.
6) Rekomendacja: Tak, wszystkie tabele z fiszkami powinny mieć RLS włączone z politykami pozwalającymi użytkownikom na dostęp tylko do swoich danych poprzez user_id.
7) Rekomendacja: Tak, indeksy na user_id, flashcard_set_id oraz ewentualnie na next_review_date dla optymalizacji zapytań sesji nauki.
8) Rekomendacja: Soft delete z polem deleted_at, ponieważ użytkownicy mogą przypadkowo usunąć fiszki i chcieć je przywrócić, a także dla analizy danych.
9) Rekomendacja: Tak, w tabeli generation_sessions lub jako pole w flashcard_sets, aby móc analizować jakość generowania i ewentualnie regenerować fiszki.
10) Rekomendacja: Dla MVP nie jest potrzebne, ale rozważ partycjonowanie tabeli ratings po miesiącach jeśli oczekujemy dużej ilości danych z czasem.

</odpowiedzi>
<pytania2>
Jaki konkretnie algorytm spaced repetition planujemy użyć - standardowy SM-2, czy może inny (np. FSRS)?
Rekomendacja: Określić algorytm SM-2 jako domyślny dla MVP, ponieważ jest prosty i sprawdzony, z polami ease_factor, interval i repetitions.
Czy sesje nauki powinny być przechowywane jako osobne encje z historią odpowiedzi użytkownika?
Rekomendacja: Tak, tabela learning_sessions z relacją do flashcards i polami jak response_quality, timestamp, aby móc analizować postęp nauki.
Jak przechowywać metadane generowania fiszek przez AI - czy potrzebujemy informacji o modelu, czasie generowania itp.?
Rekomendacja: Tak, tabela ai_generations lub pola w flashcards z modelem AI, timestamp, confidence_score dla analizy jakości.
Czy użytkownicy powinni móc tworzyć foldery/kategorie dla organizowania zestawów fiszek?
Rekomendacja: Dla MVP wystarczy płaska struktura zestawów, ale rozważ tabelę categories z relacją wiele-do-wielu do flashcard_sets dla przyszłej funkcjonalności.
Jak obsługiwać import/eksport fiszek - czy potrzebujemy pól dla zewnętrznych identyfikatorów?
Rekomendacja: Dodać opcjonalne pole external_id typu UUID dla przyszłej funkcjonalności importu z innych aplikacji jak Anki.
Czy potrzebujemy tabeli dla statystyk użytkownika (liczba fiszek, dni nauki, itp.)?
Rekomendacja: Tak, tabela user_stats z cached statistics, aktualizowana przez triggers, aby uniknąć kosztownych obliczeń w czasie rzeczywistym.
Jak obsługiwać przypomnienia/powiadomienia o czasie powtórki fiszek?
Rekomendacja: Dodać pole notification_enabled w tabeli users i scheduled_notifications z foreign key do scheduling dla przyszłej funkcjonalności.
Czy fiszki powinny wspierać multimedia (obrazy, audio) w przyszłości?
Rekomendacja: Dodać opcjonalne pola media_url typu text w tabeli flashcards, aby przygotować schemat na rozszerzenia poza tekst.
Jak implementować backup/recovery dla danych użytkownika?
Rekomendacja: Rozważyć pole last_backup_date w tabeli users i ewentualną tabelę backups dla metadanych, ale dla MVP polegać na standardowych procedurach Supabase.
Czy potrzebujemy tabeli dla logów błędów generowania AI lub innych zdarzeń systemowych?
Rekomendacja: Tak, tabela system_logs z typem zdarzenia, message i user_id dla debugowania i monitorowania jakości AI.
</pytania2>
<odpowiedzi2>
1) Rekomendacja: Określić algorytm SM-2 jako domyślny dla MVP, ponieważ jest prosty i sprawdzony, z polami ease_factor, interval i repetitions.
2) Rekomendacja: Tak, tabela learning_sessions z relacją do flashcards i polami jak response_quality, timestamp, aby móc analizować postęp nauki.
3) Rekomendacja: Tak, tabela ai_generations lub pola w flashcards z modelem AI, timestamp, confidence_score dla analizy jakości.
4) plaska struktura na poczatek
5) brak na razie, ale w przyszlosci chcialbym moc miec strukture TAGI i mozliwosc filtrowania
6) Rekomendacja: Tak, tabela user_stats z cached statistics, aktualizowana przez triggers, aby uniknąć kosztownych obliczeń w czasie rzeczywistym.
7) Rekomendacja: Dodać pole notification_enabled w tabeli users i scheduled_notifications z foreign key do scheduling dla przyszłej funkcjonalności.
8) Rekomendacja: Dodać opcjonalne pola media_url typu text w tabeli flashcards, aby przygotować schemat na rozszerzenia poza tekst.
9) brak implementacji
10) Rekomendacja: Tak, tabela system_logs z typem zdarzenia, message i user_id dla debugowania i monitorowania jakości AI.
</odpowiedzi2>
