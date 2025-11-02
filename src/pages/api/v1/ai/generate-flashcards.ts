import type { APIRoute } from "astro";
import { z } from "zod";
import { generateFlashcardsFromText } from "../../../../lib/services/aiService";
import { checkRateLimit } from "../../../../lib/rate-limiter";

export const prerender = false;

const GenerateFlashcardsSchema = z.object({
  source_text: z.string().min(1, "Source text is required."),
  setName: z.string().min(1, "Set name is required."),
});

export const POST: APIRoute = async ({ request, locals }) => {
  const { user } = locals;
  if (!user) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
  }

  // Rate Limiting
  const { allowed, retryAfter } = checkRateLimit(user.id);
  if (!allowed) {
    const headers = retryAfter ? { "Retry-After": retryAfter.toString() } : {};
    return new Response(JSON.stringify({ message: "Too Many Requests" }), {
      status: 429,
      headers,
    });
  }

  const body = await request.json();
  const validation = GenerateFlashcardsSchema.safeParse(body);

  if (!validation.success) {
    return new Response(JSON.stringify({ message: "Invalid input", errors: validation.error.flatten() }), {
      status: 400,
    });
  }

  const { data, error } = await generateFlashcardsFromText(validation.data);

  if (error) {
    // In a real app, we would log this error to a logging service
    console.error("AI Generation Error:", error);
    return new Response(JSON.stringify({ message: error }), { status: 500 });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};
