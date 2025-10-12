-- Optional: allow unauthenticated (anon) to execute the name RPC so visitors can see reviewer names
-- Review security implications before applying this change in production

revoke all on function public.get_user_public_names(uuid[]) from anon;
grant execute on function public.get_user_public_names(uuid[]) to anon;
