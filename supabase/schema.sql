-- Void — database schema
-- Run in the Supabase SQL editor, or via the Supabase CLI.

-- ---------------------------------------------------------------------------
-- Profiles: one row per auth user, holds public-facing username.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    username text unique not null,
    created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Posts
-- ---------------------------------------------------------------------------
create table if not exists public.posts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    content text not null check (char_length(content) <= 500),
    created_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_user_id_idx on public.posts (user_id);

-- ---------------------------------------------------------------------------
-- Auto-create a profile when a new auth user signs up.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.profiles (id, username)
    values (
        new.id,
        coalesce(new.raw_user_meta_data ->> 'username', 'user_' || substr(new.id::text, 1, 8))
    );
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.posts enable row level security;

-- Profiles: anyone can read; a user can update only their own.
create policy "Profiles are viewable by everyone"
    on public.profiles for select
    using (true);

create policy "Users can update own profile"
    on public.profiles for update
    using (auth.uid() = id);

-- Posts: public read; users write/delete only their own rows.
create policy "Posts are viewable by everyone"
    on public.posts for select
    using (true);

create policy "Users can insert own posts"
    on public.posts for insert
    with check (auth.uid() = user_id);

create policy "Users can delete own posts"
    on public.posts for delete
    using (auth.uid() = user_id);
