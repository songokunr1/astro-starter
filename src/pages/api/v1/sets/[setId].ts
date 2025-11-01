import type { APIRoute } from "astro";
import { z } from "zod";
import { getFlashcardSetById } from "../../../../lib/services/flashcardSetService";

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
