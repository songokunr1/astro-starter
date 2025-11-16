import type { APIRoute } from "astro";
import { z } from "zod";
import {
  getFlashcardSetById,
  updateFlashcardSet,
  deleteFlashcardSet,
} from "../../../../lib/services/flashcardSetService";
import type { UpdateFlashcardSetCommand } from "@/types";

export const prerender = false;

const setIdSchema = z.string().uuid();

export const GET: APIRoute = async ({ params, locals }) => {
  const { supabase } = locals;
  const { setId } = params;

  const validation = setIdSchema.safeParse(setId);

  if (!validation.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid set ID format. A valid UUID is required.",
        details: validation.error.flatten(),
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const flashcardSet = await getFlashcardSetById(supabase, validation.data);

    if (!flashcardSet) {
      return new Response(
        JSON.stringify({
          error: `Flashcard set with ID ${validation.data} not found.`,
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(flashcardSet), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // TODO: Add proper error logging
    console.error(`Error fetching flashcard set ${validation.data}:`, error);
    return new Response(
      JSON.stringify({
        error: "An unexpected server error occurred.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

const UpdateSetSchema = z.object({
  name: z.string().min(1, "Set name cannot be empty.").optional(),
  description: z.string().optional().nullable(),
});

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const { user, supabase } = locals;
  if (!user) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
  }

  // Validate Set ID from URL
  const setIdValidation = setIdSchema.safeParse(params.setId);
  if (!setIdValidation.success) {
    return new Response(JSON.stringify({ message: "Invalid Set ID format." }), { status: 400 });
  }
  const setId = setIdValidation.data;

  // Validate request body
  let command: UpdateFlashcardSetCommand;
  try {
    command = await request.json();
  } catch (error) {
    return new Response(JSON.stringify({ message: "Invalid JSON body." }), { status: 400 });
  }

  const validationResult = UpdateSetSchema.safeParse(command);
  if (!validationResult.success) {
    return new Response(
      JSON.stringify({
        message: "Invalid input data.",
        errors: validationResult.error.flatten(),
      }),
      { status: 400 }
    );
  }

  // Call the service
  const { data, error } = await updateFlashcardSet(supabase, setId, validationResult.data);

  if (error) {
    console.error(`Error in updateFlashcardSet for set ${setId}:`, error);
    // The service returns null data for not found cases due to RLS
    if (!data) {
      return new Response(JSON.stringify({ message: `Set with ID ${setId} not found.` }), { status: 404 });
    }
    return new Response(JSON.stringify({ message: "Failed to update flashcard set." }), { status: 500 });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const { user, supabase } = locals;
  if (!user) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
  }

  // Validate Set ID from URL
  const setIdValidation = setIdSchema.safeParse(params.setId);
  if (!setIdValidation.success) {
    return new Response(JSON.stringify({ message: "Invalid Set ID format." }), { status: 400 });
  }
  const setId = setIdValidation.data;

  // Call the service
  const { error, count } = await deleteFlashcardSet(supabase, setId);

  if (error) {
    if (error.message === "Not Found" || count === 0) {
      return new Response(JSON.stringify({ message: `Set with ID ${setId} not found.` }), { status: 404 });
    }
    console.error(`Error in deleteFlashcardSet for set ${setId}:`, error);
    return new Response(JSON.stringify({ message: "Failed to delete flashcard set." }), { status: 500 });
  }

  return new Response(null, { status: 204 });
};
