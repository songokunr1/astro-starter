import type { LearningSessionFlashcardDto } from "@/types";
import type { SupabaseClient } from "@/db/supabase.client";

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
  options: { setId?: string; limit: number },
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
    `,
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

  return { data: mappedData, error: null };
}
