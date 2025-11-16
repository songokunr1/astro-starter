import { describe, expect, it } from "vitest";

import { sm2 } from "@/lib/sm2";

describe("sm2", () => {
  it("throws when quality is outside the 0-5 range", () => {
    expect(() =>
      sm2({
        quality: 6,
        repetitions: 0,
        easeFactor: 2.5,
        interval: 0,
      })
    ).toThrow(/quality/i);
  });

  it("resets repetitions and interval when the answer is wrong", () => {
    const result = sm2({
      quality: 2,
      repetitions: 5,
      easeFactor: 2.5,
      interval: 20,
    });

    expect(result).toEqual({
      repetitions: 0,
      easeFactor: 2.5,
      interval: 1,
      isCorrect: false,
    });
  });

  it("progresses repetitions, interval and ease factor for correct answers", () => {
    const first = sm2({
      quality: 4,
      repetitions: 0,
      easeFactor: 2.5,
      interval: 0,
    });
    expect(first).toMatchObject({ repetitions: 1, interval: 1, isCorrect: true });

    const second = sm2({
      quality: 5,
      repetitions: first.repetitions,
      easeFactor: first.easeFactor,
      interval: first.interval,
    });
    expect(second).toMatchObject({ repetitions: 2, interval: 6, isCorrect: true });

    const third = sm2({
      quality: 5,
      repetitions: second.repetitions,
      easeFactor: second.easeFactor,
      interval: second.interval,
    });
    expect(third.interval).toBeGreaterThan(second.interval);
    expect(third.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it("never reduces ease factor below 1.3", () => {
    const result = sm2({
      quality: 3,
      repetitions: 10,
      easeFactor: 1.31,
      interval: 15,
    });

    expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
  });
});
