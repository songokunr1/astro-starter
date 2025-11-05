# REST API Plan

This document opisuje REST API dla Fiszki AI. Uwzględnia już zaimplementowany przepływ logowania i ręcznego zarządzania fiszkami oraz planowany przepływ AI.

## 1. Resources

- **Profiles** – dane użytkowników (`profiles`).
- **Flashcard Sets** – zestawy fiszek (`flashcard_sets`).
- **Flashcards** – pojedyncze fiszki (`flashcards`).
- **AI** – wirtualny zasób odpowiadający za generowanie treści przez LLM.
- **Learning** – przepływy związane z algorytmem powtórek.

## 2. Endpoints

### 2.1. Profiles
(Niezmienione – jak dotychczas.)

### 2.2. Flashcard Sets
(Niezmienione – `GET /api/v1/sets`, `POST /api/v1/sets`, `GET|PATCH|DELETE /api/v1/sets/{setId}`.)

### 2.3. Flashcards

#### POST /api/v1/sets/{setId}/flashcards
- **Opis**: Ręczne dodawanie fiszki do wybranego zestawu.
- **Body**:
  ```json
  {
    "front": "string (required, max 200)",
    "back": "string (required, max 200)",
    "media_url": "string | null"
  }
  ```
- **Odpowiedź**: Nowo utworzona fiszka (201).
- **Błędy**: `400`, `401`, `404` (brak zestawu lub brak dostępu).

#### PATCH /api/v1/sets/{setId}/flashcards/{flashcardId}
- **Opis**: Aktualizacja fiszki w kontekście zestawu (edytujemy front/back/media).
- **Body**:
  ```json
  {
    "front": "string (optional, max 200)",
    "back": "string (optional, max 200)",
    "media_url": "string | null"
  }
  ```
- **Odpowiedź**: Zaktualizowana fiszka (200).
- **Błędy**: `400` (brak pól), `401`, `404` (brak fiszki lub brak dostępu).

#### DELETE /api/v1/sets/{setId}/flashcards/{flashcardId}
- **Opis**: Soft delete fiszki (ustawienie `deleted_at`).
- **Body**: brak.
- **Odpowiedź**: `204 No Content`.
- **Błędy**: `401`, `404` (brak fiszki lub brak dostępu).

> **Uwagi**: Płaski endpoint `/api/v1/flashcards/{id}` pozostaje opcjonalny; aktualne UI korzysta z wersji zagnieżdżonej (łatwiejsza walidacja i RLS).

### 2.4. AI Operations – aktualizacja i rozszerzenie

#### POST /api/v1/ai/generate
- **Opis**: Proxy do modelu LLM generującego fiszki. Zwraca tymczasowy zestaw do podglądu.
- **Body**:
  ```json
  {
    "setName": "string (required)",
    "source_text": "string (required)",
    "language": "string (optional, default \"pl\")",
    "flashcard_limit":  __integer__ (optional, default 20),
    "temperature": __number__ (optional, default 0.7)
  }
  ```
- **Proces**:
  1. Walidacja wejścia (zod).
  2. Budowa promptu systemowego i użytkownika (opisano w sekcji Integracja LLM).
  3. Wywołanie zewnętrznego API (np. OpenRouter `POST /v1/chat/completions` lub OpenAI `POST /v1/responses`).
  4. Parsowanie `assistant` JSON (oczekiwany format:
     ```json
     {
       "setName": "string",
       "flashcards": [{ "front": "...", "back": "..." }]
     }
     ```
     ).
  5. Zapis wyniku w `AiGenerationContext` (po stronie FE) i zwrot payloadu do klienta.
- **Odpowiedzi**:
  - `200 OK` + tymczasowy zestaw.
  - `400 Bad Request` (błędy walidacji / niepoprawny JSON z LLM).
  - `401 Unauthorized` (brak tokenu).
  - `429 Too Many Requests` (limity modelu, jeśli sygnalizowane przez API).
  - `500 Internal Server Error` (problemy z LLM lub nieoczekiwane odpowiedzi).

#### POST /api/v1/ai/accept
- **Opis**: Akceptacja wygenerowanego zestawu i zapis do bazy.
- **Body**:
  ```json
  {
    "setName": "string",
    "source_text": "string",
    "flashcards": [
      { "front": "string", "back": "string" }
    ]
  }
  ```
- **Proces**:
  1. Walidacja (min. 1 fiszka, front/back ≤ 200 znaków).
  2. Wywołanie serwisu `createSetWithFlashcards` (Supabase RPC) lub sekwencyjnych mutacji.
  3. Zwrot `201 Created` + podstawowy DTO zestawu.
- **Błędy**: `400`, `401`, `409` (jeśli nazwa zestawu koliduje – opcjonalnie), `500`.

#### DELETE /api/v1/ai/session (opcjonalne)
- **Opis**: czyszczenie tymczasowych danych (np. gdy użytkownik odrzuci zestaw).

### 2.5. Learning and Ratings
(Niezmienione.)

## 3. Integracja z LLM (Plan dla `/generate-ai`)

- **Dostawca**: rekomendacja na dziś – OpenRouter (umożliwia wybór modeli, np. `gpt-4.1`, `anthropic/claude-3.5-sonnet`) lub bezpośrednio OpenAI `gpt-4o-mini`.
- **Endpoint**: `POST https://openrouter.ai/api/v1/chat/completions` (lub odpowiednik OpenAI).
- **Nagłówki**: `Authorization: Bearer <OPENROUTER_API_KEY>`, `HTTP-Referer` (wymóg OpenRouter), `Content-Type: application/json`.
- **Prompt**:
  - **System**: „Jesteś asystentem generującym fiszki. Zwracaj wyłącznie JSON zgodny ze schematem { setName: string, flashcards: [{ front, back }] }. front/back ≤ 200 znaków.”
  - **User**: konkatencja nazwy zestawu, języka, limitu fiszek, tekstu źródłowego.
- **Format odpowiedzi**: model musi zwrócić czysty JSON. Backend waliduje (zod) i w razie potrzeby próbuje odczytać z bloku markdown (fallback).
- **Obsługa błędów**: mapowanie kodów HTTP z LLM na nasze (np. 429 → 429, 5xx → 502/500). W przypadku przekroczenia limitu – czytelny komunikat i sugestia ponowienia później.

## 4. Autoryzacja i Limity

- Każdy endpoint chroniony nagłówkiem `Authorization: Bearer <JWT>`.
- RLS dba o dostęp tylko do danych właściciela.
- Rate-limiter (60 req/min) szczególnie dla `/ai/generate` – do wdrożenia na poziomie API Astro lub reverse proxy.

## 5. Walidacja i logowanie błędów

- Zod w każdej trasie.
- Dodatkowe logowanie (console/logger) dla błędów LLM – przydatne do diagnostyki.
- Błędy w UI komunikowane przez toasty (`Login`, `/generate`, `/generate-ai`).

## 6. Roadmapa API

1. **Aktualnie gotowe**: logowanie, manualny generator, inline CRUD fiszek.
2. **W trakcie**: Delete fiszki, dopracowanie komunikatów błędów.
3. **Planowane**:
   - Endpoint proxy do LLM (`/api/v1/ai/generate`).
   - Akceptacja wygenerowanych fiszek (`/api/v1/ai/accept`).
   - Opcjonalnie: endpoint do kasowania sesji AI oraz mechanizm wersjonowania generowanych zestawów.
