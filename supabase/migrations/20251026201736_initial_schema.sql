--
-- migration: 20251026201736_initial_schema
--
-- description: sets up the initial database schema for fiszki ai, including tables, policies, triggers, and indexes.
--
-- affected tables:
-- - profiles
-- - flashcard_sets
-- - flashcards
-- - learning_schedules
-- - flashcard_ratings
-- - learning_sessions
-- - user_stats
-- - system_logs
--

-- table: profiles
-- description: stores public user data, extending supabases auth.users table.
create table public.profiles (
    id uuid not null primary key references auth.users(id) on delete cascade,
    username text unique,
    avatar_url text,
    notification_enabled boolean not null default true,
    updated_at timestamptz not null default now(),
    constraint username_length check (length(username) >= 3)
);

-- comments on profiles table
comment on table public.profiles is 'public user data, extending supabases auth.users table.';
comment on column public.profiles.id is 'users unique identifier from the authentication table.';
comment on column public.profiles.username is 'public username for the user.';
comment on column public.profiles.avatar_url is 'url to the users avatar image.';
comment on column public.profiles.notification_enabled is 'users preference for receiving notifications.';
comment on column public.profiles.updated_at is 'timestamp of the last update.';

-- enable row level security for profiles
alter table public.profiles enable row level security;

--
-- policies for profiles
--
-- policy: allow authenticated users to view their own profile.
create policy "allow authenticated select on own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

-- policy: disallow anonymous users to view profiles.
create policy "disallow anonymous select on profiles"
on public.profiles for select
to anon
using (false);

-- policy: allow authenticated users to update their own profile.
create policy "allow authenticated update on own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id);

-- policy: disallow anonymous users to update profiles.
create policy "disallow anonymous update on profiles"
on public.profiles for update
to anon
using (false);

-- policy: disallow all inserts on profiles (handled by trigger).
create policy "disallow all insert on profiles"
on public.profiles for insert
with check (false);

-- policy: disallow all deletes on profiles (handled by auth cascade).
create policy "disallow all delete on profiles"
on public.profiles for delete
using (false);


-- function and trigger to create a profile for a new user
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username');
  return new;
end;
$$;

comment on function public.handle_new_user() is 'creates a new profile row for a new user from auth.users.';

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- table: flashcard_sets
-- description: groups of flashcards created by users.
create table public.flashcard_sets (
    id uuid not null primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    name text not null,
    description text,
    source_text text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    constraint name_length check (length(name) > 0)
);

-- comments on flashcard_sets table
comment on table public.flashcard_sets is 'groups of flashcards created by users.';
comment on column public.flashcard_sets.user_id is 'the user who owns this set.';
comment on column public.flashcard_sets.deleted_at is 'for soft-deleting the set.';

-- enable row level security for flashcard_sets
alter table public.flashcard_sets enable row level security;

--
-- policies for flashcard_sets
--
-- policy: allow authenticated users to view their own non-deleted sets.
create policy "allow authenticated select on own flashcard_sets"
on public.flashcard_sets for select
to authenticated
using (auth.uid() = user_id and deleted_at is null);

-- policy: allow authenticated users to insert into their own sets.
create policy "allow authenticated insert on own flashcard_sets"
on public.flashcard_sets for insert
to authenticated
with check (auth.uid() = user_id);

-- policy: allow authenticated users to update their own sets.
create policy "allow authenticated update on own flashcard_sets"
on public.flashcard_sets for update
to authenticated
using (auth.uid() = user_id);

-- policy: allow authenticated users to delete their own sets (soft delete should be done via update).
create policy "allow authenticated delete on own flashcard_sets"
on public.flashcard_sets for delete
to authenticated
using (auth.uid() = user_id);

-- policy: disallow anonymous access to flashcard_sets.
create policy "disallow anonymous all on flashcard_sets"
on public.flashcard_sets for all
to anon
using (false);

-- table: flashcards
-- description: individual flashcards with a front and back.
create table public.flashcards (
    id uuid not null primary key default gen_random_uuid(),
    flashcard_set_id uuid not null references public.flashcard_sets(id) on delete cascade,
    front text not null,
    back text not null,
    media_url text,
    external_id uuid,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

-- comments on flashcards table
comment on table public.flashcards is 'individual flashcards with a front and back.';
comment on column public.flashcards.flashcard_set_id is 'the set this flashcard belongs to.';
comment on column public.flashcards.deleted_at is 'for soft-deleting the flashcard.';

-- enable row level security for flashcards
alter table public.flashcards enable row level security;

-- helper function to check flashcard set ownership
create function public.is_flashcard_set_owner(p_flashcard_set_id uuid)
returns boolean
language sql
security definer
as $$
  select exists (
    select 1
    from public.flashcard_sets
    where id = p_flashcard_set_id and user_id = auth.uid()
  );
$$;

--
-- policies for flashcards
--
-- policy: allow authenticated users to view their own non-deleted flashcards.
create policy "allow authenticated select on own flashcards"
on public.flashcards for select
to authenticated
using (public.is_flashcard_set_owner(flashcard_set_id) and deleted_at is null);

-- policy: allow authenticated users to insert into their own sets.
create policy "allow authenticated insert on own flashcards"
on public.flashcards for insert
to authenticated
with check (public.is_flashcard_set_owner(flashcard_set_id));

-- policy: allow authenticated users to update their own flashcards.
create policy "allow authenticated update on own flashcards"
on public.flashcards for update
to authenticated
using (public.is_flashcard_set_owner(flashcard_set_id));

-- policy: allow authenticated users to delete their own flashcards.
create policy "allow authenticated delete on own flashcards"
on public.flashcards for delete
to authenticated
using (public.is_flashcard_set_owner(flashcard_set_id));

-- policy: disallow anonymous access to flashcards.
create policy "disallow anonymous all on flashcards"
on public.flashcards for all
to anon
using (false);

-- table: learning_schedules
-- description: stores the spaced repetition schedule for each user and flashcard.
create table public.learning_schedules (
    id uuid not null primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    flashcard_id uuid not null references public.flashcards(id) on delete cascade,
    next_review_date timestamptz not null,
    interval integer not null default 1,
    repetitions integer not null default 0,
    ease_factor real not null default 2.5,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(user_id, flashcard_id)
);

-- comments on learning_schedules table
comment on table public.learning_schedules is 'stores the spaced repetition schedule for each user and flashcard (sm-2 algorithm).';

-- enable row level security for learning_schedules
alter table public.learning_schedules enable row level security;

--
-- policies for learning_schedules
--
-- policy: allow authenticated users to manage their own schedules.
create policy "allow authenticated all on own learning_schedules"
on public.learning_schedules for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- policy: disallow anonymous access to learning_schedules.
create policy "disallow anonymous all on learning_schedules"
on public.learning_schedules for all
to anon
using (false);


-- table: flashcard_ratings
-- description: stores user feedback on ai-generated flashcards.
create table public.flashcard_ratings (
    id uuid not null primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    flashcard_id uuid not null references public.flashcards(id) on delete cascade,
    rating smallint not null,
    created_at timestamptz not null default now(),
    constraint rating_check check (rating in (1, -1)),
    unique(user_id, flashcard_id)
);

-- comments on flashcard_ratings table
comment on table public.flashcard_ratings is 'stores user feedback on ai-generated flashcards.';
comment on column public.flashcard_ratings.rating is 'the rating given: 1 for thumbs up, -1 for thumbs down.';

-- enable row level security for flashcard_ratings
alter table public.flashcard_ratings enable row level security;

--
-- policies for flashcard_ratings
--
-- policy: allow authenticated users to manage their own ratings.
create policy "allow authenticated all on own flashcard_ratings"
on public.flashcard_ratings for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- policy: disallow anonymous access to flashcard_ratings.
create policy "disallow anonymous all on flashcard_ratings"
on public.flashcard_ratings for all
to anon
using (false);


-- table: learning_sessions
-- description: records the history of learning sessions for analysis.
create table public.learning_sessions (
    id uuid not null primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    flashcard_id uuid not null references public.flashcards(id) on delete cascade,
    response_quality smallint not null,
    session_date timestamptz not null default now(),
    constraint response_quality_check check (response_quality between 0 and 5)
);

-- comments on learning_sessions table
comment on table public.learning_sessions is 'records the history of learning sessions for analysis.';
comment on column public.learning_sessions.response_quality is 'users self-assessed quality of response (e.g., sm-2 scale).';

-- enable row level security for learning_sessions
alter table public.learning_sessions enable row level security;

--
-- policies for learning_sessions
--
-- policy: allow authenticated users to manage their own sessions.
create policy "allow authenticated all on own learning_sessions"
on public.learning_sessions for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- policy: disallow anonymous access to learning_sessions.
create policy "disallow anonymous all on learning_sessions"
on public.learning_sessions for all
to anon
using (false);


-- table: user_stats
-- description: cached statistics for each user.
create table public.user_stats (
    user_id uuid not null primary key references public.profiles(id) on delete cascade,
    flashcards_created integer not null default 0,
    sessions_completed integer not null default 0,
    last_seen_at timestamptz,
    updated_at timestamptz not null default now()
);

-- comments on user_stats table
comment on table public.user_stats is 'cached statistics for each user to avoid expensive real-time calculations.';

-- enable row level security for user_stats
alter table public.user_stats enable row level security;

--
-- policies for user_stats
--
-- policy: allow authenticated users to view their own stats.
create policy "allow authenticated select on own user_stats"
on public.user_stats for select
to authenticated
using (auth.uid() = user_id);

-- policy: disallow all other operations for user_stats (managed by triggers).
create policy "disallow mutations on user_stats"
on public.user_stats for all
to public
using (false);

-- table: system_logs
-- description: for debugging and monitoring system events.
create table public.system_logs (
    id uuid not null primary key default gen_random_uuid(),
    user_id uuid references public.profiles(id) on delete set null,
    event_type text not null,
    message text,
    metadata jsonb,
    created_at timestamptz not null default now()
);

-- comments on system_logs table
comment on table public.system_logs is 'for debugging and monitoring system events, especially ai generation.';

-- enable row level security for system_logs
alter table public.system_logs enable row level security;

--
-- policies for system_logs
--
-- policy: disallow all access to system_logs from clients.
create policy "disallow all access on system_logs"
on public.system_logs for all
to public
using (false);

--
-- triggers for user_stats
--
-- function to increment flashcards_created
create function public.increment_flashcards_created()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  set_owner_id uuid;
begin
  select user_id into set_owner_id from public.flashcard_sets where id = new.flashcard_set_id;
  insert into public.user_stats (user_id, flashcards_created, updated_at)
  values (set_owner_id, 1, now())
  on conflict (user_id)
  do update set
    flashcards_created = user_stats.flashcards_created + 1,
    updated_at = now();
  return new;
end;
$$;
comment on function public.increment_flashcards_created() is 'increments the flashcards_created count in user_stats.';

-- trigger on flashcard creation
create trigger on_flashcard_created
  after insert on public.flashcards
  for each row execute procedure public.increment_flashcards_created();
comment on trigger on_flashcard_created on public.flashcards is 'updates user_stats when a new flashcard is created.';

-- function to increment sessions_completed
create function public.increment_sessions_completed()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_stats (user_id, sessions_completed, last_seen_at, updated_at)
  values (new.user_id, 1, now(), now())
  on conflict (user_id)
  do update set
    sessions_completed = user_stats.sessions_completed + 1,
    last_seen_at = now(),
    updated_at = now();
  return new;
end;
$$;
comment on function public.increment_sessions_completed() is 'increments the sessions_completed count in user_stats.';

-- trigger on learning session creation
create trigger on_session_completed
  after insert on public.learning_sessions
  for each row execute procedure public.increment_sessions_completed();
comment on trigger on_session_completed on public.learning_sessions is 'updates user_stats when a new learning session is recorded.';

--
-- indexes for performance
--
-- foreign key indexes
create index on public.flashcard_sets (user_id);
create index on public.flashcards (flashcard_set_id);
create index on public.learning_schedules (user_id);
create index on public.learning_schedules (flashcard_id);
create index on public.flashcard_ratings (user_id);
create index on public.flashcard_ratings (flashcard_id);
create index on public.learning_sessions (user_id);
create index on public.learning_sessions (flashcard_id);
create index on public.system_logs (user_id);

-- query performance indexes
create index on public.learning_schedules (next_review_date);
create index on public.flashcards (deleted_at);
create index on public.flashcard_sets (deleted_at);

-- trigger to automatically update `updated_at` columns
create or replace function public.moddatetime()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

create trigger handle_updated_at_profiles
before update on public.profiles
for each row
execute procedure public.moddatetime();

create trigger handle_updated_at_flashcard_sets
before update on public.flashcard_sets
for each row
execute procedure public.moddatetime();

create trigger handle_updated_at_flashcards
before update on public.flashcards
for each row
execute procedure public.moddatetime();

create trigger handle_updated_at_learning_schedules
before update on public.learning_schedules
for each row
execute procedure public.moddatetime();

create trigger handle_updated_at_user_stats
before update on public.user_stats
for each row
execute procedure public.moddatetime();
