# Dokument wymagań produktu (PRD) - Fiszki AI

## 1. Przegląd produktu
Produkt ma na celu rozwiązanie problemu czasochłonnego manualnego tworzenia fiszek edukacyjnych poprzez wykorzystanie sztucznej inteligencji. Aplikacja ułatwi i przyspieszy proces nauki, automatyzując generowanie fiszek na podstawie dostarczonego przez użytkownika tekstu. Wersja MVP (Minimum Viable Product) skoncentruje się na kluczowych funkcjonalnościach: generowaniu fiszek z tekstu, manualnym tworzeniu, zarządzaniu (przeglądanie, edycja, usuwanie), prostym systemie kont użytkowników oraz integracji z gotowym algorytmem powtórek (spaced repetition). Początkowo produkt będzie wspierał naukę języka angielskiego, z planem na uniwersalne zastosowanie w przyszłości.

## 2. Problem użytkownika
Głównym problemem, który produkt rozwiązuje, jest czasochłonność, trudność i złożoność manualnego tworzenia fiszek. Użytkownicy chcący korzystać z efektywnej metody nauki, jaką jest spaced repetition, często są zniechęceni ilością pracy wymaganej do przygotowania wysokiej jakości materiałów. Aplikacja ma na celu usunięcie tej bariery, czyniąc naukę bardziej dostępną i efektywną.

## 3. Wymagania funkcjonalne
- FW-001: Generowanie fiszek przez AI na podstawie tekstu wklejonego przez użytkownika.
- FW-002: Manualne tworzenie, edycja i usuwanie pojedynczych fiszek.
- FW-003: Przeglądanie zestawów fiszek.
- FW-004: Prosty system kont użytkowników (rejestracja, logowanie) do przechowywania personalnych zestawów fiszek.
- FW-005: Integracja z gotowym, zewnętrznym algorytmem spaced repetition w celu umożliwienia nauki.
- FW-006: Możliwość akceptacji lub odrzucenia całego zestawu fiszek wygenerowanego przez AI.
- FW-007: System zbierania opinii (kciuk w górę/dół) na temat jakości pojedynczych, wygenerowanych przez AI fiszek.
- FW-008: Automatyczne dzielenie długich tekstów na wiele fiszek (limit 200 znaków na stronę fiszki).

## 4. Granice produktu
Następujące funkcjonalności nie wchodzą w zakres MVP i mogą zostać rozważone w przyszłych wersjach produktu:
- Rozwój własnego, zaawansowanego algorytmu powtórek (jak np. SuperMemo, Anki).
- Import materiałów z różnych formatów plików (PDF, DOCX, itp.).
- Funkcje społecznościowe, takie jak współdzielenie zestawów fiszek między użytkownikami.
- Integracje z zewnętrznymi platformami edukacyjnymi.
- Dedykowane aplikacje mobilne (iOS, Android).

## 5. Historyjki użytkowników

### Autoryzacja i Zarządzanie Kontem
- ID: US-001
- Tytuł: Rejestracja nowego użytkownika
- Opis: Jako nowy użytkownik, chcę móc założyć konto w aplikacji, aby zapisywać moje fiszki i postępy w nauce.
- Kryteria akceptacji:
  - Użytkownik może zarejestrować się podając adres e-mail i hasło.
  - Hasło musi spełniać podstawowe wymogi bezpieczeństwa (np. minimalna długość).
  - Po rejestracji użytkownik jest automatycznie zalogowany.

- ID: US-002
- Tytuł: Logowanie do aplikacji
- Opis: Jako zarejestrowany użytkownik, chcę móc zalogować się na swoje konto, aby uzyskać dostęp do moich fiszek.
- Kryteria akceptacji:
  - Użytkownik może zalogować się za pomocą adresu e-mail i hasła.
  - W przypadku podania błędnych danych, wyświetlany jest odpowiedni komunikat.
  - Użytkownik może się wylogować z aplikacji.

- ID: US-010
- Tytuł: Resetowanie hasła
- Opis: Jako użytkownik, który utracił dostęp do konta, chcę otrzymać link resetujący i ustawić nowe hasło, aby odzyskać możliwość korzystania z aplikacji.
- Kryteria akceptacji:
  - Na stronie logowania znajduje się akcja „Resetuj hasło”, która po podaniu adresu e-mail wysyła przez Supabase link resetujący (komunikat nie ujawnia, czy konto istnieje).
  - Link z wiadomości przenosi użytkownika na stronę `/reset-password`, gdzie wprowadza nowe hasło oraz jego potwierdzenie.
  - W przypadku braku lub wygaśnięcia tokenu resetującego użytkownik otrzymuje informację o konieczności ponownej prośby o reset.
  - Po pomyślnym ustawieniu hasła użytkownik jest przekierowany do strony logowania.

- ID: US-011
- Tytuł: Wylogowanie i bezpieczeństwo sesji
- Opis: Jako użytkownik, chcę mieć możliwość wylogowania się i pewność, że zasoby aplikacji są dostępne tylko dla zalogowanych osób.
- Kryteria akceptacji:
  - W głównym interfejsie (menu użytkownika w `Layout.astro`) znajduje się akcja „Wyloguj”, która natychmiast usuwa token sesji i przenosi użytkownika na stronę logowania.
  - Dostęp do widoków i operacji na zestawach, fiszkach oraz generatorach (manualny i AI) wymaga aktywnej sesji – bez ważnego tokenu użytkownik jest przekierowywany na `/login`.
  - W przypadku błędu autoryzacji (np. wygasły token) użytkownik otrzymuje komunikat i zostaje poproszony o ponowne logowanie.

### Zarządzanie Fiszkami
- ID: US-003
- Tytuł: Generowanie fiszek przez AI
- Opis: Jako użytkownik, chcę móc wkleić fragment tekstu i wygenerować z niego zestaw fiszek za pomocą AI, aby szybko przygotować materiały do nauki.
- Kryteria akceptacji:
  - W interfejsie znajduje się pole tekstowe do wklejenia tekstu.
  - Po wklejeniu tekstu i uruchomieniu generowania, AI tworzy zestaw fiszek (awers i rewers).
  - Wygenerowane fiszki są prezentowane użytkownikowi do przeglądu przed zapisaniem.
  - Jeśli tekst jest zbyt długi, jest dzielony na kilka fiszek, z zachowaniem limitu 200 znaków na stronę.

- ID: US-004
- Tytuł: Manualne tworzenie fiszki
- Opis: Jako użytkownik, chcę móc ręcznie dodać nową fiszkę do mojego zestawu, aby mieć pełną kontrolę nad treścią.
- Kryteria akceptacji:
  - Użytkownik może otworzyć formularz dodawania nowej fiszki.
  - Formularz zawiera pola na awers i rewers.
  - Po wypełnieniu pól i zapisaniu, nowa fiszka pojawia się w zestawie.

- ID: US-005
- Tytuł: Przeglądanie i akceptacja wygenerowanego zestawu
- Opis: Jako użytkownik, po wygenerowaniu fiszek przez AI, chcę je przejrzeć, aby zadecydować, czy chcę je dodać do mojej kolekcji.
- Kryteria akceptacji:
  - Wygenerowany zestaw fiszek jest wyświetlany w czytelnej formie.
  - Użytkownik ma możliwość przejrzenia każdej fiszki w zestawie.
  - Dostępne są przyciski do zaakceptowania całego zestawu lub jego odrzucenia.
  - Po akceptacji, fiszki są dodawane do kolekcji użytkownika.

- ID: US-006
- Tytuł: Edycja pojedynczej fiszki
- Opis: Jako użytkownik, chcę móc edytować treść istniejącej fiszki, aby poprawić błędy lub uzupełnić informacje.
- Kryteria akceptacji:
  - Użytkownik może wybrać opcję edycji przy dowolnej fiszce w swojej kolekcji.
  - Po wybraniu edycji, treść awersu i rewersu jest możliwa do zmiany w formularzu.
  - Zmiany są zapisywane po zatwierdzeniu przez użytkownika.

- ID: US-007
- Tytuł: Usuwanie pojedynczej fiszki
- Opis: Jako użytkownik, chcę móc usunąć niepotrzebną fiszkę ze swojej kolekcji.
- Kryteria akceptacji:
  - Użytkownik może wybrać opcję usunięcia przy dowolnej fiszce.
  - Aplikacja prosi o potwierdzenie usunięcia.
  - Po potwierdzeniu, fiszka jest trwale usuwana z kolekcji.

- ID: US-008
- Tytuł: Ocenianie jakości fiszek AI
- Opis: Jako użytkownik, chcę móc ocenić jakość wygenerowanej przez AI fiszki, aby pomóc w ulepszaniu algorytmu.
- Kryteria akceptacji:
  - Przy każdej wygenerowanej przez AI fiszce znajdują się ikony "kciuk w górę" i "kciuk w dół".
  - Użytkownik może kliknąć jedną z ikon, aby wyrazić swoją opinię.
  - Wybór użytkownika jest zapisywany w systemie.

### Nauka
- ID: US-009
- Tytuł: Sesja nauki z fiszkami
- Opis: Jako użytkownik, chcę rozpocząć sesję nauki, podczas której aplikacja będzie prezentować mi fiszki zgodnie z algorytmem spaced repetition.
- Kryteria akceptacji:
  - Użytkownik może rozpocząć sesję nauki dla wybranego zestawu fiszek.
  - Aplikacja wyświetla awers fiszki.
  - Po odsłonięciu rewersu, użytkownik może ocenić swoją znajomość odpowiedzi (np. "łatwe", "trudne", "powtórz").
  - Na podstawie oceny, algorytm spaced repetition planuje kolejną powtórkę fiszki.

## 6. Metryki sukcesu
Kryteria sukcesu dla MVP będą mierzone za pomocą następujących metryk:
- 75% fiszek wygenerowanych przez AI jest akceptowanych przez użytkownika bez edycji.
- 75% wszystkich nowo tworzonych fiszek w aplikacji pochodzi z generacji przez AI.
- Śledzenie liczby fiszek w pełni zaakceptowanych, odrzuconych oraz edytowanych po wygenerowaniu przez AI.

W przyszłości, po zebraniu większej ilości danych, planuje się wprowadzenie dodatkowych metryk zaangażowania:
- Retencja użytkowników (procent użytkowników wracających do aplikacji po 7/14/30 dniach).
- Liczba ukończonych sesji powtórek na użytkownika.
- Średnia liczba fiszek tworzonych i przechowywanych na użytkownika.
