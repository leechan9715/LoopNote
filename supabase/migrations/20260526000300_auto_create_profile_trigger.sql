-- Create a function to handle new user profiles with improved robustness
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  user_full_name text;
  user_role_raw text;
  user_role_final public.user_role;
  target_parent_id uuid;
begin
  -- 1. Extract and sanitize full name
  user_full_name := btrim(coalesce(new.raw_user_meta_data->>'full_name', '사용자'));
  if length(user_full_name) = 0 then
    user_full_name := '사용자';
  end if;

  -- 2. Extract and validate role
  user_role_raw := new.raw_user_meta_data->>'role';
  
  -- Map role string to enum, default to 'parent' if invalid or missing for safety in public signup
  if user_role_raw = 'student' then
    user_role_final := 'student'::public.user_role;
  else
    user_role_final := 'parent'::public.user_role;
  end if;

  -- 3. Extract parent_id (only relevant for students)
  begin
    target_parent_id := (new.raw_user_meta_data->>'parent_id')::uuid;
  exception when others then
    target_parent_id := null;
  end;

  -- 4. Apply business logic: student must have parent_id
  -- But if they sign up via public page, they might not have one yet.
  -- We allow it for now or enforce null for parents.
  if user_role_final = 'parent' then
    target_parent_id := null;
  end if;

  -- 5. Insert into public.profiles
  insert into public.profiles (id, full_name, role, parent_id)
  values (new.id, user_full_name, user_role_final, target_parent_id);

  return new;
exception
  when others then
    -- Log the error (Supabase logs) and provide a slightly more helpful message
    -- sqlerrm contains the internal error message
    raise log 'Error in handle_new_user trigger: %', sqlerrm;
    raise exception '가입 중 프로필 생성에 실패했습니다. (사유: %)', sqlerrm;
end;
$$;

-- Ensure the trigger is correctly attached
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
