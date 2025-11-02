import type { SupabaseClient } from "@/db/supabase.client";
import type { AcceptFlashcardsCommand, FlashcardSetDetailDto, FlashcardSetSummaryDto } from "@/types";

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
    .maybeSingle();

  if (error) {
    // TODO: Add proper error logging
    console.error("Error fetching flashcard set:", error);
    throw new Error("Failed to fetch flashcard set from the database.");
  }

  return data as FlashcardSetDetailDto | null;
}

/**
 * Creates a new flashcard set along with its flashcards in a single database transaction.
 *
 * @param supabase - The Supabase client instance.
 * @param userId - The ID of the user creating the set.
 * @param command - The command object containing the set name, source text, and flashcards.
 * @returns A promise that resolves to a summary of the newly created flashcard set or null if an error occurs.
 */
export async function createSetWithFlashcards(
  supabase: SupabaseClient,
  userId: string,
  command: AcceptFlashcardsCommand
): Promise<{ data: FlashcardSetSummaryDto | null; error: any }> {
  const { setName, source_text, flashcards } = command;

  const { data, error } = await supabase
    .rpc("create_set_with_flashcards", {
      p_user_id: userId,
      p_name: setName,
      p_source_text: source_text,
      p_flashcards: flashcards,
    })
    .select(
      `
      id,
      name,
      description,
      created_at,
      updated_at
    `
    )
    .single();

  if (error) {
    // TODO: Add proper error logging to system_logs with type DB_TRANSACTION_ERROR
    console.error("Error in create_set_with_flashcards RPC:", error);
    return { data: null, error };
  }

  return { data, error: null };
}
