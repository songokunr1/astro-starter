import type { APIRoute } from "astro";
import { z } from "zod";
import { createFlashcard } from "@/lib/services/flashcardService";
import type { CreateFlashcardCommand } from "@/types";

export const prerender = false;

const createFlashcardSchema = z.object({
  front: z.string().min(1, "Front is required.").max(200, "Front must be 200 characters or less."),
  back: z.string().min(1, "Back is required.").max(200, "Back must be 200 characters or less."),
  media_url: z.string().url("Media URL must be a valid URL.").optional().nullable(),
});

const setIdSchema = z.string().uuid();

export const POST: APIRoute = async ({ params, request, locals }) => {
  const { user, supabase } = locals;
  if (!user) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
  }

  const setIdValidation = setIdSchema.safeParse(params.setId);
  if (!setIdValidation.success) {
    return new Response(JSON.stringify({ message: "Invalid Set ID format." }), { status: 400 });
  }
  const setId = setIdValidation.data;

  let body: CreateFlashcardCommand;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ message: "Invalid JSON body." }), { status: 400 });
  }

  const validation = createFlashcardSchema.safeParse(body);
  if (!validation.success) {
    return new Response(JSON.stringify({ message: "Invalid input.", errors: validation.error.flatten() }), {
      status: 400,
    });
  }

  const { data: newFlashcard, error } = await createFlashcard(supabase, user.id, setId, validation.data);

  if (error) {
    return new Response(JSON.stringify({ message: error.message }), { status: error.status });
  }

  return new Response(JSON.stringify(newFlashcard), { status: 201 });
};
