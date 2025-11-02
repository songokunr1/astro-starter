import type { APIContext } from "astro";
import { z } from "zod";
import { getReviewSession } from "@/lib/services/learningService";

export const prerender = false;

const QuerySchema = z.object({
  setId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * GET /api/v1/learning/session
 * Retrieves flashcards scheduled for a review session.
 */
export async function GET(context: APIContext): Promise<Response> {
  const { locals } = context;

  // 1. Authentication
  if (!locals.user) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
  }

  // 2. Input validation
  const searchParams = new URL(context.request.url).searchParams;
  const validation = QuerySchema.safeParse(Object.fromEntries(searchParams));

  if (!validation.success) {
    return new Response(JSON.stringify({ message: "Bad Request", errors: validation.error.flatten() }), {
      status: 400,
    });
  }

  const { setId, limit } = validation.data;

  try {
    // 3. Call service
    const { data, error } = await getReviewSession(locals.supabase, locals.user.id, { setId, limit });

    if (error) {
      // Log the error for internal review
      console.error("Error fetching review session:", error);
      return new Response(JSON.stringify({ message: "Internal Server Error" }), { status: 500 });
    }

    // 4. Return response
    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Unexpected error in GET /learning/session:", e);
    return new Response(JSON.stringify({ message: "Internal Server Error" }), { status: 500 });
  }
}
