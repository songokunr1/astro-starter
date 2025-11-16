import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchFlashcardSets,
  fetchLearningSessionCards,
  submitReviewRequest,
} from "@/components/feature/learn/LearnPage";
import type { FlashcardSetSummaryDto, PaginatedResponseDto } from "@/types";

const token = "test-token";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Learn page data helpers", () => {
  it("fetchFlashcardSets returns data when API succeeds", async () => {
    const payload: PaginatedResponseDto<FlashcardSetSummaryDto> = {
      data: [
        {
          id: "set-1",
          name: "My set",
          description: null,
          created_at: "2024-01-01",
          updated_at: "2024-01-02",
        },
      ],
      pagination: {
        page: 1,
        pageSize: 50,
        total: 1,
      },
    };

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(payload) }));

    const result = await fetchFlashcardSets(token);
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("My set");
  });

  it("fetchFlashcardSets throws when API responds with error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: "Failed" }),
      })
    );

    await expect(fetchFlashcardSets(token)).rejects.toThrow(/pobrać listy zestawów/i);
  });

  it("fetchLearningSessionCards maps payload correctly", async () => {
    const responsePayload = { data: [{ flashcard_id: "card-1", front: "Q", back: "A" }] };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(responsePayload),
      })
    );

    const result = await fetchLearningSessionCards(token, { setId: "set-1", limit: 5 });
    expect(result).toEqual(responsePayload.data);
  });

  it("submitReviewRequest throws on server error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: "Internal error" }),
      })
    );

    await expect(submitReviewRequest(token, { flashcard_id: "card", quality: 3 })).rejects.toThrow(/internal error/i);
  });
});
