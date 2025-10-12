-- Create a security definer view to expose public-safe names to anon
-- This avoids requiring RPC execution for anonymous viewers

create or replace view public.user_public_names as
select u.id,
       coalesce(
         (u.raw_user_meta_data->>'display_name'),
         (u.raw_user_meta_data->>'full_name'),
         (u.raw_user_meta_data->>'name'),
         split_part(u.email, '@', 1)
       ) as name
from auth.users u;

-- Restrict direct access to the underlying auth schema; only the view is exposed.
-- Grant read to anon and authenticated
revoke all on public.user_public_names from public;
grant select on public.user_public_names to anon;
grant select on public.user_public_names to authenticated;
