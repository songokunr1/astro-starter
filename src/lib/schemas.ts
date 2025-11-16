import { z } from "zod";

export const SubmitReviewCommandSchema = z.object({
  flashcard_id: z.string().uuid(),
  quality: z.number().min(0).max(5),
});
