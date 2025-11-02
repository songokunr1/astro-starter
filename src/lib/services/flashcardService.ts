import type { SupabaseClient } from "@/db/supabase.client";
import type { CreateFlashcardCommand, FlashcardDto } from "@/types";

/**
 * Creates a new flashcard for a given set, ensuring the user has ownership.
 *
 * @param supabase - The Supabase client instance.
 * @param userId - The ID of the authenticated user.
 * @param setId - The ID of the flashcard set to which the flashcard will be added.
 * @param command - The flashcard data (front, back, media_url).
 * @returns An object containing either the created flashcard data or an error object.
 */
export async function createFlashcard(
  supabase: SupabaseClient,
  userId: string,
  setId: string,
  command: CreateFlashcardCommand
): Promise<{ data: FlashcardDto | null; error: { status: number; message: string } | null }> {
  // 1. Verify that the flashcard set exists and belongs to the user.
  const { data: set, error: setCheckError } = await supabase
    .from("flashcard_sets")
    .select("id")
    .eq("id", setId)
    .eq("user_id", userId)
    .single();

  if (setCheckError || !set) {
    return {
      data: null,
      error: { status: 404, message: "Flashcard set not found or you do not have permission to access it." },
    };
  }

  // 2. Insert the new flashcard into the database.
  const { data: newFlashcard, error: insertError } = await supabase
    .from("flashcards")
    .insert({
      ...command,
      flashcard_set_id: setId,
    })
    .select("id, front, back, media_url, created_at, updated_at")
    .single();

  if (insertError) {
    // TODO: Replace with a proper logger
    return { data: null, error: { status: 500, message: "Could not create flashcard." } };
  }

  // 3. Return the newly created flashcard.
  return { data: newFlashcard, error: null };
}
