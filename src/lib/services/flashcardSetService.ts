import type { SupabaseClient } from "@/db/supabase.client";
import type {
  AcceptFlashcardsCommand,
  CreateFlashcardSetCommand,
  FlashcardSetDetailDto,
  FlashcardSetSummaryDto,
  PaginatedResponseDto,
  UpdateFlashcardSetCommand,
} from "@/types";

/**
 * Defines the options for fetching flashcard sets, including pagination and sorting.
 */
interface GetFlashcardSetsOptions {
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

/**
 * Retrieves a paginated list of flashcard sets for a specific user.
 *
 * @param supabase - The Supabase client instance.
 * @param userId - The ID of the user whose flashcard sets are to be retrieved.
 * @param options - An object containing pagination and sorting parameters.
 * @returns A promise that resolves to a paginated response DTO containing the flashcard sets.
 */
export async function getFlashcardSets(
  supabase: SupabaseClient,
  userId: string,
  options: GetFlashcardSetsOptions
): Promise<PaginatedResponseDto<FlashcardSetSummaryDto>> {
  const { page, pageSize, sortBy, sortOrder } = options;
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize - 1;

  // Query to fetch the paginated data
  const dataQuery = supabase
    .from("flashcard_sets")
    .select(
      `
      id,
      name,
      description,
      created_at,
      updated_at
    `,
      { count: "exact" }
    )
    .eq("user_id", userId)
    .is("deleted_at", null) // Filter out soft-deleted sets
    .order(sortBy, { ascending: sortOrder === "asc" })
    .range(startIndex, endIndex);

  const { data, error, count } = await dataQuery;

  if (error) {
    // TODO: Add proper error logging
    console.error("Error fetching flashcard sets:", error);
    throw new Error("Failed to fetch flashcard sets from the database.");
  }

  return {
    data: data || [],
    pagination: {
      page,
      pageSize,
      total: count || 0,
    },
  };
}

/**
 * Creates a new, empty flashcard set for the authenticated user.
 *
 * @param supabase - The Supabase client instance.
 * @param userId - The ID of the user creating the set.
 * @param command - The command object containing the set's name and optional description.
 * @returns A promise that resolves to an object containing the new set's summary DTO or an error.
 */
export async function createFlashcardSet(
  supabase: SupabaseClient,
  userId: string,
  command: CreateFlashcardSetCommand
): Promise<{ data: FlashcardSetSummaryDto | null; error: any }> {
  const { data, error } = await supabase
    .from("flashcard_sets")
    .insert({
      user_id: userId,
      name: command.name,
      description: command.description,
    })
    .select("id, name, description, created_at, updated_at")
    .single();

  if (error) {
    // TODO: Add proper error logging
    console.error("Error creating flashcard set:", error);
  }

  return { data, error };
}

/**
 * Updates an existing flashcard set's details.
 * The RLS policy ensures that a user can only update their own sets.
 *
 * @param supabase The Supabase client instance.
 * @param setId The ID of the set to update.
 * @param command The command object with the new name and/or description.
 * @returns A promise that resolves to an object with the updated set data or an error.
 */
export async function updateFlashcardSet(
  supabase: SupabaseClient,
  setId: string,
  command: UpdateFlashcardSetCommand
): Promise<{ data: FlashcardSetSummaryDto | null; error: any }> {
  const { data, error } = await supabase
    .from("flashcard_sets")
    .update({
      name: command.name,
      description: command.description,
      updated_at: new Date().toISOString(), // Manually update the timestamp
    })
    .eq("id", setId)
    .select("id, name, description, created_at, updated_at")
    .single();

  if (error) {
    // TODO: Add proper error logging
    console.error(`Error updating flashcard set ${setId}:`, error);
  }

  return { data, error };
}

/**
 * Soft-deletes a flashcard set and all of its associated flashcards.
 * It sets the `deleted_at` timestamp for the set and its cards.
 *
 * @param supabase The Supabase client instance.
 * @param setId The ID of the set to delete.
 * @returns A promise that resolves to an object containing an error if one occurred, or a count of affected rows.
 */
export async function deleteFlashcardSet(
  supabase: SupabaseClient,
  setId: string
): Promise<{ error: any; count: number | null }> {
  const timestamp = new Date().toISOString();

  // Step 1: Soft-delete the flashcard set itself.
  // The .select() here is to get the count of affected rows.
  const { error: setError, count } = await supabase
    .from("flashcard_sets")
    .update({ deleted_at: timestamp })
    .eq("id", setId)
    .select();

  if (setError) {
    console.error(`Error soft-deleting set ${setId}:`, setError);
    return { error: setError, count: null };
  }

  // If no rows were updated, it means the set was not found or the user didn't have permission.
  if (count === 0) {
    return { error: { message: "Not Found" }, count: 0 };
  }

  // Step 2: Soft-delete all flashcards within that set.
  const { error: cardsError } = await supabase
    .from("flashcards")
    .update({ deleted_at: timestamp })
    .eq("flashcard_set_id", setId);

  if (cardsError) {
    // This is a partial failure state. The set is deleted, but the cards are not.
    // A database transaction or RPC function would prevent this.
    // TODO: Add critical error logging for partial failures.
    console.error(`Error soft-deleting flashcards for set ${setId}:`, cardsError);
    return { error: cardsError, count: null };
  }

  return { error: null, count };
}

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
    .is("deleted_at", null) // Ensure the set is not soft-deleted
    .filter("flashcards.deleted_at", "is", "null")
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
