-- Drop the old policy that was missing the 'WITH CHECK' clause.
DROP POLICY "Users can update their own flashcard sets." ON public.flashcard_sets;

-- Create the new, correct policy.
-- The 'USING' clause lets you target rows you own.
-- The 'WITH CHECK' clause is the crucial fix: it tells Postgres to ONLY
-- re-verify ownership on the updated row, instead of incorrectly using
-- the SELECT policy's rules.
CREATE POLICY "Users can update their own flashcard sets."
ON public.flashcard_sets FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);



