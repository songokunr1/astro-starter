<conversation_summary>
<decisions>
1. Fiszki początkowo powiązane tylko z jednym użytkownikiem bez możliwości współdzielenia (rozszerzenie planowane w przyszłości)
2. Implementacja tabeli scheduling dla spaced repetition z polami next_review_date, interval, ease_factor
3. Oceny jakości fiszek przechowywane w osobnej tabeli flashcard_ratings z relacją wiele-do-jednego do fiszek
4. Użycie typu text dla zawartości awersu i rewersu fiszek zamiast varchar z limitem
5. Relacja jeden-do-wielu między zestawami fiszek (flashcard_sets) a fiszkami (flashcards)
6. Włączenie Row Level Security (RLS) dla wszystkich tabel zawierających dane fiszek z politykami dostępu poprzez user_id
7. Dodanie indeksów na kluczowych polach: user_id, flashcard_set_id, next_review_date
8. Implementacja soft delete z polem deleted_at dla fiszek i zestawów
9. Przechowywanie tekstu źródłowego używanego do generowania fiszek przez AI
10. Brak partycjonowania tabel dla MVP - skupienie na prostocie
11. Wybór algorytmu SM-2 jako domyślnego dla spaced repetition
12. Implementacja tabeli learning_sessions dla przechowywania historii sesji nauki
13. Przechowywanie metadanych generowania AI w tabeli ai_generations lub polach flashcards
14. Płaska struktura organizacji zestawów bez kategorii/katalogów w MVP
15. Przygotowanie struktury TAGI zamiast external_id dla przyszłej funkcjonalności filtrowania
16. Implementacja tabeli user_stats z cached statistics aktualizowanymi przez triggers
17. Dodanie pola notification_enabled w tabeli users oraz tabeli scheduled_notifications dla przyszłych powiadomień
18. Dodanie opcjonalnych pól media_url w tabeli flashcards dla przyszłego wsparcia multimediów
19. Brak dedykowanej implementacji backup/recovery - poleganie na standardowych procedurach Supabase
20. Implementacja tabeli system_logs dla logów błędów generowania AI i innych zdarzeń systemowych
</decisions>

<matched_recommendations>
1. Implementacja tabeli scheduling dla spaced repetition z polami ease_factor, interval, repetitions dla algorytmu SM-2
2. Osobna tabela flashcard_ratings dla ocen jakości z foreign keys do użytkowników i fiszek
3. Użycie typu text dla zawartości fiszek dla elastyczności
4. Relacja jeden-do-wielu między flashcard_sets a flashcards dla uproszczenia zarządzania
5. Włączenie RLS dla wszystkich tabel z fiszkami z politykami dostępu poprzez user_id
6. Indeksy na user_id, flashcard_set_id oraz next_review_date dla optymalizacji zapytań
7. Soft delete z polem deleted_at dla możliwości przywracania danych
8. Tabela generation_sessions lub ai_generations dla przechowywania metadanych generowania AI
9. Tabela learning_sessions dla historii odpowiedzi użytkownika w sesjach nauki
10. Tabela user_stats z cached statistics aktualizowanymi przez triggers
11. Przygotowanie pól media_url w flashcards dla przyszłego wsparcia multimediów
12. Tabela system_logs dla debugowania i monitorowania jakości AI
</matched_recommendations>

<database_planning_summary>
## Główne wymagania dotyczące schematu bazy danych

Baza danych dla MVP aplikacji fiszek AI została zaprojektowana w oparciu o PostgreSQL (Supabase) z naciskiem na bezpieczeństwo danych użytkowników poprzez RLS oraz optymalizację wydajności poprzez indeksy. Kluczowym wymogiem jest obsługa spaced repetition algorytmu SM-2 oraz generowania fiszek przez AI z możliwością ich oceny i modyfikacji.

## Kluczowe encje i ich relacje

**Podstawowe encje:**
- `users` - dane użytkowników z autentyfikacją Supabase
- `flashcard_sets` - zestawy fiszek należące do użytkowników (1 użytkownik → wiele zestawów)
- `flashcards` - pojedyncze fiszki w zestawach (1 zestaw → wiele fiszek)
- `scheduling` - harmonogram powtórek dla każdej fiszki użytkownika (1 fiszka → 1 rekord scheduling per użytkownik)

**Encje rozszerzające funkcjonalność:**
- `flashcard_ratings` - oceny jakości fiszek przez użytkowników (wiele ocen → 1 fiszka)
- `learning_sessions` - historia sesji nauki z odpowiedziami użytkownika
- `ai_generations` - metadane generowania fiszek przez AI (model, timestamp, confidence_score)
- `user_stats` - cache'owane statystyki użytkownika (liczba fiszek, dni nauki, itp.)
- `system_logs` - logi błędów i zdarzeń systemowych

**Główne relacje:**
- users → flashcard_sets (1:N)
- flashcard_sets → flashcards (1:N) 
- flashcards → scheduling (1:1 per user)
- flashcards → flashcard_ratings (1:N)
- users → learning_sessions (1:N)
- users → user_stats (1:1)
- users → system_logs (1:N)

## Ważne kwestie dotyczące bezpieczeństwa i skalowalności

**Bezpieczeństwo:**
- Row Level Security (RLS) włączone dla wszystkich tabel zawierających dane użytkowników
- Polityki RLS oparte na user_id - użytkownicy widzą tylko swoje dane
- Soft delete dla ochrony przed przypadkowym usunięciem danych
- Supabase Auth dla autentyfikacji użytkowników

**Skalowalność:**
- Indeksy na kluczowych polach wyszukiwania (user_id, flashcard_set_id, next_review_date)
- Cached statistics w tabeli user_stats dla uniknięcia kosztownych obliczeń
- Brak partycjonowania dla MVP - skupienie na prostocie i optymalizacji podstawowych zapytań
- Przygotowanie na przyszłe rozszerzenia (multimedia, współdzielenie, tagi)

## Podejście do rozwoju

Schemat został zaprojektowany z myślą o MVP z jednoczesnym przygotowaniem na przyszłe rozszerzenia. Wszystkie kluczowe funkcjonalności (generowanie AI, spaced repetition, oceny jakości) mają swoje reprezentacje w bazie danych. Architektura pozwala na łatwe dodawanie nowych funkcji bez konieczności przeprojektowywania podstawowych relacji.
</database_planning_summary>

<unresolved_issues>
1. Szczegóły implementacji systemu TAGI dla filtrowania fiszek - wymaga określenia struktury tabel i relacji
2. Mechanizm współdzielenia zestawów fiszek między użytkownikami - wymaga decyzji architektonicznych
3. Obsługa multimediów w fiszkach - wymaga decyzji o przechowywaniu plików (Supabase Storage vs zewnętrzne URL)
4. Implementacja powiadomień o czasie powtórki - wymaga decyzji o technologii (email, push notifications, in-app)
5. Szczegóły algorytmu SM-2 - wymaga implementacji dokładnych formuł kalkulacji interwałów
6. Strategia backup/recovery - wymaga analizy wymagań RODO i decyzji o dodatkowych mechanizmach poza Supabase
</unresolved_issues>
</conversation_summary>
