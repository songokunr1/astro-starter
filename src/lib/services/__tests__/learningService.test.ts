import { describe, expect, it, vi } from "vitest";

import type { SupabaseClient } from "@/db/supabase.client";
import { getReviewSession } from "@/lib/services/learningService";

type QueryResult = { data: any; error: any };

function createSupabaseMock(responses: Record<string, QueryResult[]>) {
  const queues = new Map<string, QueryResult[]>(
    Object.entries(responses).map(([table, entries]) => [table, [...entries]]),
  );

  function createBuilder(table: string) {
    const builder: any = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      lte: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      order: vi.fn(() => builder),
      is: vi.fn(() => builder),
      then(onFulfilled: (value: QueryResult) => void, onRejected?: (reason: unknown) => void) {
        const queue = queues.get(table) ?? [];
        const next = queue.shift() ?? { data: null, error: null };
        return Promise.resolve(next).then(onFulfilled, onRejected);
      },
    };

    return builder;
  }

  return {
    supabase: {
      from: vi.fn((table: string) => createBuilder(table)),
    } as unknown as SupabaseClient,
  };
}

describe("learningService.getReviewSession", () => {
  const userId = "user-123";
  const setId = "set-1";

  it("returns scheduled flashcards when available", async () => {
    const scheduleData = [
      {
        id: "schedule-1",
        next_review_date: "2024-01-01T00:00:00.000Z",
        flashcard: {
          id: "card-1",
          front: "Q1",
          back: "A1",
          flashcard_set_id: setId,
        },
      },
      {
        id: "schedule-2",
        next_review_date: "2024-01-02T00:00:00.000Z",
        flashcard: {
          id: "card-2",
          front: "Q2",
          back: "A2",
          flashcard_set_id: setId,
        },
      },
    ];

    const { supabase } = createSupabaseMock({
      learning_schedules: [{ data: scheduleData, error: null }],
    });

    const { data, error } = await getReviewSession(supabase, userId, { limit: 5 });

    expect(error).toBeNull();
    expect(data).toEqual([
      {
        id: "schedule-1",
        next_review_date: "2024-01-01T00:00:00.000Z",
        flashcard_id: "card-1",
        front: "Q1",
        back: "A1",
      },
      {
        id: "schedule-2",
        next_review_date: "2024-01-02T00:00:00.000Z",
        flashcard_id: "card-2",
        front: "Q2",
        back: "A2",
      },
    ]);
  });

  it("falls back to plain flashcards when schedule is empty", async () => {
    const fallbackFlashcards = [
      {
        id: "card-10",
        front: "Front",
        back: "Back",
        flashcard_set_id: setId,
        flashcard_set: { user_id: userId },
      },
    ];

    const { supabase } = createSupabaseMock({
      learning_schedules: [{ data: [], error: null }],
      flashcards: [{ data: fallbackFlashcards, error: null }],
    });

    const { data, error } = await getReviewSession(supabase, userId, { setId, limit: 5 });

    expect(error).toBeNull();
    expect(data).toEqual([
      expect.objectContaining({
        flashcard_id: "card-10",
        front: "Front",
        back: "Back",
      }),
    ]);
  });
});


