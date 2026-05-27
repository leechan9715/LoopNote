create type public.user_role as enum ('student', 'parent');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  full_name text not null check (length(btrim(full_name)) > 0),
  parent_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint profiles_parent_not_self check (parent_id is null or parent_id <> id),
  constraint profiles_parent_role_check check (
    (role = 'parent' and parent_id is null)
    or (role = 'student' and parent_id is not null)
  )
);

comment on table public.profiles is 'LoopNote user profile linked to Supabase Auth users.';
comment on column public.profiles.id is 'Primary key matching auth.users.id.';
comment on column public.profiles.role is 'Application role for parent or student users.';
comment on column public.profiles.full_name is 'Display name shown in LoopNote.';
comment on column public.profiles.parent_id is 'Parent profile id for student accounts.';

create index profiles_parent_id_idx on public.profiles (parent_id);

grant usage on type public.user_role to authenticated, service_role;
grant select on public.profiles to authenticated;
grant insert (id, role, full_name, parent_id) on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

create policy "Profiles are readable by owner or parent"
  on public.profiles
  for select
  to authenticated
  using (
    id = auth.uid()
    or parent_id = auth.uid()
  );

create policy "Users can insert their own profile"
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
