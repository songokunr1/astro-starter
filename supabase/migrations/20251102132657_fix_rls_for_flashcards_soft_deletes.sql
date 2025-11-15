-- Drop the old policies that will be replaced to avoid conflicts.
DROP POLICY IF EXISTS "allow authenticated select on own flashcards" ON public.flashcards;
DROP POLICY IF EXISTS "allow authenticated update on own flashcards" ON public.flashcards;

-- Create a new SELECT policy for flashcards.
-- The check for `deleted_at IS NULL` is removed from the policy and will be handled
-- in the application code. This prevents the policy from blocking soft-delete updates.
CREATE POLICY "Users can view flashcards of their own sets"
ON public.flashcards FOR SELECT
USING (is_flashcard_set_owner(flashcard_set_id));

-- Create a new, more robust UPDATE policy for flashcards.
-- This allows updates, including soft-deletes, on flashcards if the user owns the parent set.
-- The WITH CHECK clause ensures that ownership is maintained after the update.
CREATE POLICY "Users can update flashcards of their own sets"
ON public.flashcards FOR UPDATE
USING (is_flashcard_set_owner(flashcard_set_id))
WITH CHECK (is_flashcard_set_owner(flashcard_set_id));



