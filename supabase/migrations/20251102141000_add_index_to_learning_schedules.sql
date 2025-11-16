-- Add a composite index to the learning_schedules table
-- This index is crucial for efficiently querying review sessions for a specific user,
-- ordered by the next review date. It speeds up the primary query pattern for the
-- learning session endpoint.
CREATE INDEX idx_learning_schedules_user_id_next_review_date ON public.learning_schedules(user_id, next_review_date);
