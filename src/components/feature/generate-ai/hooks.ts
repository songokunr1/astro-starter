import { useMutation } from "@tanstack/react-query";

import type { AiGenerationFormState } from "@/lib/ai-generation-context";
import type { GenerateFlashcardsResponseDto } from "@/types";

export type GenerateAiErrorType = "unauthorized" | "rate-limit" | "validation" | "server" | "network";

export class GenerateAiError extends Error {
  type: GenerateAiErrorType;
  status?: number;
  retryAfter?: number;

  constructor(type: GenerateAiErrorType, message: string, options: { status?: number; retryAfter?: number } = {}) {
    super(message);
    this.name = "GenerateAiError";
    this.type = type;
    this.status = options.status;
    this.retryAfter = options.retryAfter;
  }
}

interface GenerateAiMutationVariables {
  token: string;
  payload: AiGenerationFormState;
}

async function parseJsonSafely<T>(response: Response): Promise<T | undefined> {
  const contentType = response.headers.get("Content-Type") ?? "";

  if (!contentType.includes("application/json")) {
    return undefined;
  }

  try {
    return (await response.json()) as T;
  } catch {
    return undefined;
  }
}

async function generateAiRequest({
  token,
  payload,
}: GenerateAiMutationVariables): Promise<GenerateFlashcardsResponseDto> {
  if (!token) {
    throw new GenerateAiError("unauthorized", "Missing authentication token.");
  }

  try {
    const response = await fetch("/api/v1/ai/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        setName: payload.setName,
        source_text: payload.sourceText,
        flashcard_limit: payload.flashcardLimit ?? undefined,
        temperature: payload.temperature ?? undefined,
        front_language: payload.frontLanguage,
        back_language: payload.backLanguage,
      }),
    });

    const body = await parseJsonSafely<GenerateFlashcardsResponseDto & { message?: string }>(response);

    if (!response.ok) {
      const message = body?.message ?? "Failed to generate flashcards.";

      if (response.status === 401 || response.status === 403) {
        throw new GenerateAiError("unauthorized", message, { status: response.status });
      }

      if (response.status === 429) {
        const retryAfterHeader = response.headers.get("Retry-After");
        const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : undefined;
        throw new GenerateAiError("rate-limit", message, {
          status: response.status,
          retryAfter: retryAfter && Number.isFinite(retryAfter) ? retryAfter : undefined,
        });
      }

      if (response.status === 400) {
        throw new GenerateAiError("validation", message, { status: response.status });
      }

      throw new GenerateAiError("server", message, { status: response.status });
    }

    if (!body) {
      throw new GenerateAiError("server", "AI service returned an empty response.");
    }

    return {
      temp_id: body.temp_id,
      setName: body.setName,
      source_text: body.source_text,
      flashcards: body.flashcards,
    } satisfies GenerateFlashcardsResponseDto;
  } catch (error) {
    if (error instanceof GenerateAiError) {
      throw error;
    }

    throw new GenerateAiError("network", "Network error while reaching AI service.");
  }
}

export function useGenerateAiDraftMutation() {
  return useMutation<GenerateFlashcardsResponseDto, GenerateAiError, GenerateAiMutationVariables>({
    mutationFn: generateAiRequest,
  });
}

export class AcceptDraftError extends Error {
  type: "unauthorized" | "validation" | "server" | "network";

  constructor(type: "unauthorized" | "validation" | "server" | "network", message: string) {
    super(message);
    this.name = "AcceptDraftError";
    this.type = type;
  }
}

interface AcceptDraftMutationVariables {
  token: string;
  payload: AiGenerationResultState;
}

async function acceptDraftRequest({ token, payload }: AcceptDraftMutationVariables): Promise<FlashcardSetSummaryDto> {
  if (!token) {
    throw new AcceptDraftError("unauthorized", "Missing authentication token.");
  }

  const body: AcceptFlashcardsCommand = {
    temp_id: payload.tempId ?? `temp-${Date.now()}`,
    setName: payload.setName,
    source_text: payload.sourceText,
    flashcards: payload.flashcards.map(({ front, back }) => ({ front, back })),
  };

  try {
    const response = await fetch("/api/v1/ai/accept-flashcards", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new AcceptDraftError("unauthorized", "Session expired. Please log in again.");
      }
      if (response.status === 400) {
        throw new AcceptDraftError("validation", "Invalid data provided for flashcard set.");
      }
      throw new AcceptDraftError("server", "Failed to save the flashcard set on the server.");
    }

    return (await response.json()) as FlashcardSetSummaryDto;
  } catch (error) {
    if (error instanceof AcceptDraftError) {
      throw error;
    }
    throw new AcceptDraftError("network", "Network error while saving the draft.");
  }
}

export function useAcceptDraftMutation() {
  return useMutation<FlashcardSetSummaryDto, AcceptDraftError, AcceptDraftMutationVariables>({
    mutationFn: acceptDraftRequest,
  });
}
