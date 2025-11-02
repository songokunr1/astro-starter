import type { SupabaseClient } from "@/db/supabase.client";
import type { CreateFlashcardCommand, FlashcardDto } from "@/types";
import type { UpdateFlashcardCommand } from "@/types";

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

/**
 * Updates an existing flashcard, ensuring the user has ownership via RLS.
 *
 * @param supabase - The Supabase client instance.
 * @param flashcardId - The ID of the flashcard to update.
 * @param command - The flashcard data to update (front, back, media_url).
 * @returns An object containing either the updated flashcard data or an error object.
 */
export async function updateFlashcard(
  supabase: SupabaseClient,
  flashcardId: string,
  command: UpdateFlashcardCommand
): Promise<{ data: FlashcardDto | null; error: { status: number; message: string } | null }> {
  const updatePayload: UpdateFlashcardCommand = {};
  if (command.front) updatePayload.front = command.front;
  if (command.back) updatePayload.back = command.back;
  if (command.media_url !== undefined) updatePayload.media_url = command.media_url;

  if (Object.keys(updatePayload).length === 0) {
    return { data: null, error: { status: 400, message: "No fields to update provided." } };
  }

  const { data, error } = await supabase
    .from("flashcards")
    .update({ ...updatePayload, updated_at: new Date().toISOString() })
    .eq("id", flashcardId)
    .select("id, front, back, media_url, created_at, updated_at")
    .single();

  if (error) {
    // RLS prevents unauthorized access, resulting in a PostgREST error
    // when single() expects one row but finds zero.
    if (error.code === "PGRST116") {
      return {
        data: null,
        error: { status: 404, message: "Flashcard not found or you do not have permission to update it." },
      };
    }
    // TODO: Replace with a proper logger
    return { data: null, error: { status: 500, message: "Could not update flashcard." } };
  }

  return { data, error: null };
}

/**
 * Soft-deletes a flashcard by setting the `deleted_at` timestamp.
 * Ownership is verified by RLS.
 *
 * @param supabase - The Supabase client instance.
 * @param flashcardId - The ID of the flashcard to delete.
 * @returns An object containing an error if the operation failed.
 */
export async function deleteFlashcard(
  supabase: SupabaseClient,
  flashcardId: string
): Promise<{ error: { status: number; message: string } | null }> {
  const { error, count } = await supabase
    .from("flashcards")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", flashcardId);

  if (error) {
    // TODO: Replace with a proper logger
    return { error: { status: 500, message: "Could not delete flashcard." } };
  }

  // If count is 0, the flashcard was not found or RLS prevented the update.
  if (count === 0) {
    return {
      error: { status: 404, message: "Flashcard not found or you do not have permission to delete it." },
    };
  }

  return { error: null };
}
