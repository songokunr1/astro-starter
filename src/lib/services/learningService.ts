import type { LearningSessionFlashcardDto, SubmitReviewCommand, SubmitReviewResponseDto } from "@/types";
import type { SupabaseClient } from "@/db/supabase.client";
import { sm2 } from "@/lib/sm2";
import { add } from "date-fns/add";

/**
 * Retrieves a list of flashcards scheduled for review for the current user.
 *
 * @param supabase The Supabase client instance.
 * @param userId The ID of the authenticated user.
 * @param options An object containing optional filters.
 * @param options.setId Optional flashcard set ID to filter by.
 * @param options.limit The maximum number of flashcards to return.
 * @returns A promise that resolves to the review session flashcards.
 */
export async function getReviewSession(
  supabase: SupabaseClient,
  userId: string,
  options: { setId?: string; limit: number }
): Promise<{ data: LearningSessionFlashcardDto[] | null; error: any }> {
  const { setId, limit } = options;

  let query = supabase
    .from("learning_schedules")
    .select(
      `
      id,
      next_review_date,
      flashcard:flashcards (
        id,
        front,
        back,
        flashcard_set_id
      )
    `
    )
    .eq("user_id", userId)
    .lte("next_review_date", new Date().toISOString())
    .limit(limit)
    .order("next_review_date", { ascending: true });

  if (setId) {
    query = query.eq("flashcards.flashcard_set_id", setId);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error };
  }

  // The query above returns a nested 'flashcard' object. We need to flatten it.
  // Also, Supabase returns either an object or null for the joined table.
  // We should filter out any results where the join failed.
  const mappedData: LearningSessionFlashcardDto[] = data
    .map((schedule) => {
      // Type guard to ensure 'flashcard' is not an array and is not null
      if (!schedule.flashcard || Array.isArray(schedule.flashcard)) {
        return null;
      }
      return {
        id: schedule.id,
        next_review_date: schedule.next_review_date,
        flashcard_id: schedule.flashcard.id,
        front: schedule.flashcard.front,
        back: schedule.flashcard.back,
      };
    })
    .filter((item): item is LearningSessionFlashcardDto => item !== null);

  if (mappedData.length > 0) {
    return { data: mappedData, error: null };
  }

  const fallbackResult = await getFallbackFlashcards(supabase, userId, { setId, limit });

  if (fallbackResult.error) {
    return { data: null, error: fallbackResult.error };
  }

  return { data: fallbackResult.data, error: null };
}

async function getFallbackFlashcards(
  supabase: SupabaseClient,
  userId: string,
  options: { setId?: string; limit: number }
): Promise<{ data: LearningSessionFlashcardDto[]; error: any }> {
  // Fallback attempts to fetch plain flashcards when the spaced-repetition schedule is empty.
  const { setId, limit } = options;

  if (!setId) {
    // Without an explicit set we cannot safely fetch arbitrary flashcards.
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .from("flashcards")
    .select(
      `
      id,
      front,
      back,
      flashcard_set_id,
      flashcard_set:flashcard_sets!inner (
        user_id
      )
    `
    )
    .eq("flashcard_set_id", setId)
    .eq("flashcard_set.user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Error fetching fallback flashcards:", error);
    return { data: [], error };
  }

  // RLS ensures that only the owner can read flashcards for their sets, but we still defensively
  // verify the flashcards belong to the requested set and user by checking that some rows exist.
  const fallbackCards: LearningSessionFlashcardDto[] = (data ?? []).map((card) => ({
    id: card.id,
    flashcard_id: card.id,
    front: card.front,
    back: card.back,
    next_review_date: new Date().toISOString(),
  }));

  return { data: fallbackCards, error: null };
}

const DEFAULT_EASE_FACTOR = 2.5;

export async function submitReview(
  supabase: SupabaseClient,
  userId: string,
  command: SubmitReviewCommand
): Promise<{ data: SubmitReviewResponseDto | null; error: any }> {
  const { flashcard_id, quality } = command;

  const { data: schedule, error: scheduleError } = await supabase
    .from("learning_schedules")
    .select("*")
    .eq("flashcard_id", flashcard_id)
    .eq("user_id", userId)
    .single();

  if (scheduleError && scheduleError.code !== "PGRST116") {
    // PGRST116: " esattamente un riga" (exactly one row) is not an error, it means no row found
    return { data: null, error: scheduleError };
  }

  const repetitions = schedule?.repetitions ?? 0;
  const easeFactor = schedule?.ease_factor ?? DEFAULT_EASE_FACTOR;
  const interval = schedule?.interval ?? 0;

  const sm2Result = sm2({ quality, repetitions, easeFactor, interval });

  const nextReviewDate = add(new Date(), { days: sm2Result.interval });

  const updatedSchedule = {
    user_id: userId,
    flashcard_id,
    next_review_date: nextReviewDate.toISOString(),
    interval: sm2Result.interval,
    repetitions: sm2Result.repetitions,
    ease_factor: sm2Result.easeFactor,
  };

  const { data: upsertedData, error: upsertError } = await supabase
    .from("learning_schedules")
    .upsert(updatedSchedule)
    .select()
    .single();

  if (upsertError) {
    return { data: null, error: upsertError };
  }

  const { error: sessionError } = await supabase.from("learning_sessions").insert({
    user_id: userId,
    flashcard_id,
    quality,
  });

  if (sessionError) {
    // Log this error, but don't fail the whole operation
    // as the schedule has been updated successfully.
    console.error("Failed to log review session:", sessionError);
  }

  return { data: upsertedData, error: null };
}
