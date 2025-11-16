-- Drop all existing RLS policies on flashcard_sets for a clean slate.
DROP POLICY IF EXISTS "disallow anonymous all on flashcard_sets" ON public.flashcard_sets;
DROP POLICY IF EXISTS "Users can view their own flashcard sets." ON public.flashcard_sets;
DROP POLICY IF EXISTS "Users can create their own flashcard sets." ON public.flashcard_sets;
DROP POLICY IF EXISTS "Users can delete their own flashcard sets." ON public.flashcard_sets;
DROP POLICY IF EXISTS "Users can update their own flashcard sets." ON public.flashcard_sets;

-- Create new RLS policies for the flashcard_sets table.

-- RLS Policy: Disallow anonymous access
-- Anonymous users should not be able to perform any action on flashcard sets.
CREATE POLICY "disallow anonymous all on flashcard_sets"
ON public.flashcard_sets FOR ALL
TO anon
USING (false);

-- RLS Policy: SELECT
-- Users can only select (view) their own flashcard sets.
-- The check for `deleted_at IS NULL` is moved to the application queries
-- to prevent this policy from interfering with the UPDATE policy during soft deletes.
CREATE POLICY "Users can view their own flashcard sets."
ON public.flashcard_sets FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policy: INSERT
-- Users can only insert (create) flashcard sets where they are the owner.
CREATE POLICY "Users can create their own flashcard sets."
ON public.flashcard_sets FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policy: UPDATE
-- Users can only update their own flashcard sets. This policy now works for
-- soft deletes because the SELECT policy no longer interferes.
CREATE POLICY "Users can update their own flashcard sets."
ON public.flashcard_sets FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policy: DELETE
-- Users can only (hard) delete their own flashcard sets.
CREATE POLICY "Users can delete their own flashcard sets."
ON public.flashcard_sets FOR DELETE
USING (auth.uid() = user_id);
