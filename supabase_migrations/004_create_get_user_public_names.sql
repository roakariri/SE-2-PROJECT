-- Create a secure RPC to expose public names for auth user IDs
-- Run this migration in your Supabase project

create or replace function public.get_user_public_names(ids uuid[])
returns table (id uuid, name text, email_local text)
language sql
security definer
set search_path = public, auth
as $$
  select u.id,
         coalesce(
           (u.raw_user_meta_data->>'display_name'),
           (u.raw_user_meta_data->>'full_name'),
           (u.raw_user_meta_data->>'name'),
           null
         ) as name,
         split_part(u.email, '@', 1) as email_local
  from auth.users u
  where u.id = any(ids)
$$;

-- Lock down function access
revoke all on function public.get_user_public_names(uuid[]) from public;
grant execute on function public.get_user_public_names(uuid[]) to authenticated;
