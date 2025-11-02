import type { APIRoute } from "astro";
import { z } from "zod";
import { createSetWithFlashcards } from "@/lib/services/flashcardSetService";
import type { AcceptFlashcardsCommand } from "@/types";

export const prerender = false;

// Zod schema for input validation, based on AcceptFlashcardsCommand.
const AcceptFlashcardsSchema = z.object({
  temp_id: z.string(),
  setName: z.string().min(1, "Set name cannot be empty."),
  source_text: z.string(),
  flashcards: z
    .array(
      z.object({
        front: z.string().min(1, "Flashcard front cannot be empty."),
        back: z.string().min(1, "Flashcard back cannot be empty."),
      })
    )
    .min(1, "At least one flashcard is required."),
});

/**
 * API endpoint to accept and save a set of AI-generated flashcards.
 * This endpoint performs the final step of the flashcard generation process,
 * persisting the data to the database.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const { user } = locals;

  // 1. Authenticate user
  if (!user) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  let command: AcceptFlashcardsCommand;
  try {
    command = await request.json();
  } catch (error) {
    return new Response(JSON.stringify({ message: "Invalid JSON body" }), {
      status: 400,
    });
  }

  // 2. Validate the request body
  const validationResult = AcceptFlashcardsSchema.safeParse(command);
  if (!validationResult.success) {
    return new Response(
      JSON.stringify({
        message: "Invalid input data",
        errors: validationResult.error.flatten(),
      }),
      { status: 400 }
    );
  }

  // 3. Call the service to create the flashcard set
  const { data, error } = await createSetWithFlashcards(locals.supabase, user.id, validationResult.data);

  // 4. Handle potential transaction errors
  if (error) {
    // Note: The service already logs the detailed error.
    // Here we can add a system log for the transaction failure event if needed.
    return new Response(JSON.stringify({ message: "Failed to create flashcard set." }), { status: 500 });
  }

  // 5. Return 201 Created on success
  return new Response(JSON.stringify(data), {
    status: 201,
    headers: {
      "Content-Type": "application/json",
    },
  });
};
