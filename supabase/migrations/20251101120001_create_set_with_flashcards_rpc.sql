create or replace function create_set_with_flashcards(
    p_user_id uuid,
    p_name text,
    p_source_text text,
    p_flashcards jsonb
)
returns setof flashcard_sets
language plpgsql
security definer
as $$
declare
    new_set_id uuid;
begin
    -- The entire function runs within a single transaction.
    -- We add explicit exception handling to log the exact error.
    begin
        -- 1. Ensure a profile exists for the user.
        insert into public.profiles (id)
        values (p_user_id)
        on conflict (id) do nothing;

        -- 2. Insert the new flashcard set and retrieve its ID.
        insert into public.flashcard_sets (user_id, name, source_text)
        values (p_user_id, p_name, p_source_text)
        returning id into new_set_id;

        -- 3. Check if there are any flashcards to insert.
        if jsonb_array_length(p_flashcards) > 0 then
            -- 4. Perform a bulk insert of all flashcards.
            insert into public.flashcards (flashcard_set_id, front, back)
            select
                new_set_id,
                (value->>'front')::text,
                (value->>'back')::text
            from jsonb_array_elements(p_flashcards) as value;
        end if;

    exception
        when others then
            -- If any error occurs, log it to system_logs before re-throwing.
            insert into public.system_logs (user_id, event_type, message, metadata)
            values (
                p_user_id,
                'DB_TRANSACTION_ERROR',
                'Error in create_set_with_flashcards RPC: ' || SQLERRM,
                jsonb_build_object('state', SQLSTATE, 'detail', SQLERRM)
            );
            raise; -- Re-throw the original error to ensure the transaction rolls back.
    end;

    -- 5. Return the newly created flashcard set if the transaction was successful.
    return query
        select *
        from public.flashcard_sets
        where id = new_set_id;
end;
$$;

comment on function public.create_set_with_flashcards(uuid, text, text, jsonb) is 'Atomically creates a new flashcard set and all its associated flashcards in a single transaction. Ensures user profile exists and includes detailed error logging.';
