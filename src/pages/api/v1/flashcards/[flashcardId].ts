import { z } from "zod";
import { type APIRoute } from "astro";
import { deleteFlashcard, updateFlashcard } from "@/lib/services/flashcardService";

const FlashcardIdSchema = z.string().uuid({
  message: "Flashcard ID must be a valid UUID.",
});

const UpdateFlashcardCommandSchema = z
  .object({
    front: z.string().max(200, "Front cannot exceed 200 characters.").optional(),
    back: z.string().max(200, "Back cannot exceed 200 characters.").optional(),
    media_url: z.string().url("Media URL must be a valid URL.").nullable().optional(),
  })
  .refine((data) => data.front !== undefined || data.back !== undefined || data.media_url !== undefined, {
    message: "At least one field (front, back, or media_url) must be provided for an update.",
    path: [],
  });

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const { flashcardId } = params;
  const { supabase, user } = locals;

  if (!user) {
    return new Response(null, { status: 401 });
  }

  const idValidation = FlashcardIdSchema.safeParse(flashcardId);
  if (!idValidation.success) {
    return new Response(JSON.stringify({ error: idValidation.error.flatten() }), { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch (_e) {
    return new Response(JSON.stringify({ error: { message: "Invalid JSON body." } }), { status: 400 });
  }

  const bodyValidation = UpdateFlashcardCommandSchema.safeParse(body);
  if (!bodyValidation.success) {
    return new Response(JSON.stringify({ error: bodyValidation.error.flatten() }), { status: 400 });
  }

  const { data, error } = await updateFlashcard(supabase, idValidation.data, bodyValidation.data);

  if (error) {
    return new Response(JSON.stringify({ error }), { status: error.status });
  }

  return new Response(JSON.stringify(data), { status: 200 });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const { flashcardId } = params;
  const { supabase, user } = locals;

  if (!user) {
    return new Response(null, { status: 401 });
  }

  const validation = FlashcardIdSchema.safeParse(flashcardId);
  if (!validation.success) {
    return new Response(JSON.stringify({ error: validation.error.flatten() }), { status: 400 });
  }

  const { error } = await deleteFlashcard(supabase, validation.data);

  if (error) {
    return new Response(JSON.stringify({ error }), { status: error.status });
  }

  return new Response(null, { status: 204 });
};
