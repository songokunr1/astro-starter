import type { APIRoute } from "astro";
import { submitReview } from "@/lib/services/learningService";
import { SubmitReviewCommandSchema } from "@/lib/schemas";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const { user, supabase } = locals;

  if (!user) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch (_error) {
    return new Response(JSON.stringify({ message: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const validation = SubmitReviewCommandSchema.safeParse(body);

  if (!validation.success) {
    return new Response(JSON.stringify({ message: "Invalid input", errors: validation.error.flatten() }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data, error } = await submitReview(supabase, user.id, validation.data);

  if (error) {
    console.error("Error submitting review:", error);
    // Basic error handling, can be improved to map specific DB errors to HTTP statuses
    if (error.code === "23503") {
      // foreign key violation
      return new Response(JSON.stringify({ message: "Flashcard not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ message: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!data) {
    return new Response(JSON.stringify({ message: "Flashcard or schedule not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
