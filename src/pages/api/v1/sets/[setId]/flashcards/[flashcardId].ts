import type { APIRoute } from "astro";
import { z } from "zod";

import { updateFlashcard, deleteFlashcard } from "@/lib/services/flashcardService";
import type { UpdateFlashcardCommand } from "@/types";

export const prerender = false;

const setIdSchema = z.string().uuid();
const flashcardIdSchema = z.string().uuid();

const updateFlashcardSchema = z
  .object({
    front: z.string().min(1, "Front is required.").max(200, "Front must be 200 characters or less.").optional(),
    back: z.string().min(1, "Back is required.").max(200, "Back must be 200 characters or less.").optional(),
    media_url: z.string().url("Media URL must be a valid URL.").nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided for update.",
  });

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const { supabase, user } = locals;

  if (!user) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
  }

  const setIdValidation = setIdSchema.safeParse(params.setId);
  if (!setIdValidation.success) {
    return new Response(JSON.stringify({ message: "Invalid set ID." }), { status: 400 });
  }

  const flashcardIdValidation = flashcardIdSchema.safeParse(params.flashcardId);
  if (!flashcardIdValidation.success) {
    return new Response(JSON.stringify({ message: "Invalid flashcard ID." }), { status: 400 });
  }

  let command: UpdateFlashcardCommand;
  try {
    command = await request.json();
  } catch {
    return new Response(JSON.stringify({ message: "Invalid JSON body." }), { status: 400 });
  }

  const validation = updateFlashcardSchema.safeParse(command);
  if (!validation.success) {
    return new Response(
      JSON.stringify({
        message: "Invalid input.",
        errors: validation.error.flatten(),
      }),
      { status: 400 }
    );
  }

  const { data, error } = await updateFlashcard(supabase, flashcardIdValidation.data, validation.data);

  if (error) {
    return new Response(JSON.stringify({ message: error.message }), { status: error.status });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const { supabase, user } = locals;

  if (!user) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
  }

  const flashcardIdValidation = flashcardIdSchema.safeParse(params.flashcardId);
  if (!flashcardIdValidation.success) {
    return new Response(JSON.stringify({ message: "Invalid flashcard ID." }), { status: 400 });
  }

  const { error } = await deleteFlashcard(supabase, flashcardIdValidation.data);

  if (error) {
    return new Response(JSON.stringify({ message: error.message }), { status: error.status });
  }

  return new Response(null, { status: 204 });
};
