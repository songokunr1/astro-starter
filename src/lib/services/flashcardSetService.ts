import type { SupabaseClient } from "../../../db/supabase.client";
import type { FlashcardSetDetailDto } from "../../../types";

/**
 * Retrieves a single flashcard set with its flashcards by its ID, for the authenticated user.
 *
 * @param supabase - The Supabase client instance.
 * @param setId - The unique identifier of the flashcard set.
 * @returns A promise that resolves to the detailed flashcard set DTO or null if not found.
 */
export async function getFlashcardSetById(
  supabase: SupabaseClient,
  setId: string
): Promise<FlashcardSetDetailDto | null> {
  const { data, error } = await supabase
    .from("flashcard_sets")
    .select(
      `
      id,
      name,
      description,
      created_at,
      updated_at,
      flashcards (
        id,
        front,
        back,
        media_url,
        created_at,
        updated_at
      )
    `
    )
    .eq("id", setId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    // TODO: Add proper error logging
    console.error("Error fetching flashcard set:", error);
    throw new Error("Failed to fetch flashcard set from the database.");
  }

  return data as FlashcardSetDetailDto | null;
}
