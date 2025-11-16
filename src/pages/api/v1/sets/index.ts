import type { APIRoute } from "astro";
import { z } from "zod";
import { getFlashcardSets, createFlashcardSet } from "@/lib/services/flashcardSetService";
import type { CreateFlashcardSetCommand } from "@/types";

export const prerender = false;

// Schema for validating query parameters
const QueryParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(["name", "created_at", "updated_at"]).default("updated_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * API endpoint to retrieve a paginated list of flashcard sets for the authenticated user.
 */
export const GET: APIRoute = async ({ url, locals }) => {
  const { user, supabase } = locals;

  // 1. Ensure user is authenticated
  if (!user) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
  }

  // 2. Validate query parameters
  const queryParams = Object.fromEntries(url.searchParams.entries());
  const validationResult = QueryParamsSchema.safeParse(queryParams);

  if (!validationResult.success) {
    return new Response(
      JSON.stringify({
        message: "Invalid query parameters.",
        errors: validationResult.error.flatten(),
      }),
      { status: 400 }
    );
  }

  const { page, pageSize, sortBy, sortOrder } = validationResult.data;

  try {
    // 3. Call the service to fetch the data
    const paginatedData = await getFlashcardSets(supabase, user.id, {
      page,
      pageSize,
      sortBy,
      sortOrder,
    });

    // 4. Return the successful response
    return new Response(JSON.stringify(paginatedData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // 5. Handle potential server errors
    // In a real app, log this error to a monitoring service
    console.error("Error fetching flashcard sets:", error);
    return new Response(
      JSON.stringify({
        message: "An internal server error occurred.",
      }),
      { status: 500 }
    );
  }
};

const CreateSetSchema = z.object({
  name: z.string().min(1, "Set name cannot be empty."),
  description: z.string().optional().nullable(),
});

export const POST: APIRoute = async ({ request, locals }) => {
  const { user, supabase } = locals;

  if (!user) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
  }

  let command: CreateFlashcardSetCommand;
  try {
    command = await request.json();
  } catch (error) {
    return new Response(JSON.stringify({ message: "Invalid JSON body" }), { status: 400 });
  }

  const validationResult = CreateSetSchema.safeParse(command);

  if (!validationResult.success) {
    return new Response(
      JSON.stringify({
        message: "Invalid input data",
        errors: validationResult.error.flatten(),
      }),
      { status: 400 }
    );
  }

  const { data, error } = await createFlashcardSet(supabase, user.id, validationResult.data);

  if (error) {
    console.error("Error in createFlashcardSet:", error);
    return new Response(
      JSON.stringify({
        message: "Failed to create flashcard set.",
      }),
      { status: 500 }
    );
  }

  return new Response(JSON.stringify(data), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
};
