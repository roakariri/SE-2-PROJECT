DROP TRIGGER IF EXISTS on_auth_user_mirror_v2 ON auth.users;
DROP FUNCTION IF EXISTS public.mirror_auth_user();

CREATE TABLE IF NOT EXISTS public.mirror_authentication (
  uid UUID PRIMARY KEY,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ
);

ALTER TABLE public.mirror_authentication
ADD CONSTRAINT fk_mirror_auth_uid
FOREIGN KEY (uid) REFERENCES auth.users(id)
ON UPDATE CASCADE
ON DELETE CASCADE;

INSERT INTO public.mirror_authentication (uid, display_name, email, created_at, last_sign_in_at)
SELECT
  u.id,
  COALESCE(
    NULLIF(TRIM(BOTH FROM u.raw_user_meta_data ->> 'display_name'), ''),
    NULLIF(TRIM(BOTH FROM u.raw_user_meta_data ->> 'displayName'), ''),
    NULLIF(TRIM(BOTH FROM u.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(TRIM(BOTH FROM u.raw_user_meta_data ->> 'name'), ''),
    NULLIF(TRIM(BOTH FROM u.raw_user_meta_data #>> '{user_metadata,display_name}'), ''),
    NULLIF(TRIM(BOTH FROM u.raw_user_meta_data #>> '{user_metadata,full_name}'), ''),
    NULLIF(TRIM(BOTH FROM i.identity_data ->> 'display_name'), ''),
    NULLIF(TRIM(BOTH FROM i.identity_data ->> 'displayName'), ''),
    NULLIF(TRIM(BOTH FROM i.identity_data ->> 'full_name'), ''),
    NULLIF(TRIM(BOTH FROM i.identity_data ->> 'name'), ''),
    split_part(u.email, '@', 1)
  ),
  u.email,
  u.created_at,
  u.last_sign_in_at
FROM auth.users AS u
LEFT JOIN LATERAL (
  SELECT identity_data, last_sign_in_at, created_at
  FROM auth.identities
  WHERE user_id = u.id
  ORDER BY last_sign_in_at DESC NULLS LAST, created_at DESC NULLS LAST
  LIMIT 1
) AS i ON TRUE
ON CONFLICT (uid) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  email = EXCLUDED.email,
  created_at = EXCLUDED.created_at,
  last_sign_in_at = EXCLUDED.last_sign_in_at;

CREATE OR REPLACE FUNCTION public.mirror_auth_user()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  user_id UUID;
  user_row auth.users%ROWTYPE;
  identity_name TEXT;
BEGIN
  user_id := COALESCE(NEW.id, NEW.user_id);
  RAISE NOTICE 'Mirroring user %', user_id;

  -- Fetch the current user data
  SELECT * INTO user_row FROM auth.users WHERE id = user_id;
  IF NOT FOUND THEN
    RAISE NOTICE 'User % not found', user_id;
    RETURN COALESCE(NEW, OLD);
  END IF;

  BEGIN
    SELECT COALESCE(
             NULLIF(TRIM(BOTH FROM identity_data ->> 'display_name'), ''),
             NULLIF(TRIM(BOTH FROM identity_data ->> 'displayName'), ''),
             NULLIF(TRIM(BOTH FROM identity_data ->> 'full_name'), ''),
             NULLIF(TRIM(BOTH FROM identity_data ->> 'name'), '')
           )
    INTO identity_name
    FROM auth.identities
    WHERE user_id = user_id
    ORDER BY last_sign_in_at DESC NULLS LAST, created_at DESC NULLS LAST
    LIMIT 1;

    RAISE NOTICE 'Identity name for user %: %', user_id, identity_name;

    INSERT INTO public.mirror_authentication (uid, display_name, email, created_at, last_sign_in_at)
    VALUES (
      user_id,
      COALESCE(
        NULLIF(TRIM(BOTH FROM user_row.raw_user_meta_data ->> 'display_name'), ''),
        NULLIF(TRIM(BOTH FROM user_row.raw_user_meta_data ->> 'displayName'), ''),
        NULLIF(TRIM(BOTH FROM user_row.raw_user_meta_data ->> 'full_name'), ''),
        NULLIF(TRIM(BOTH FROM user_row.raw_user_meta_data ->> 'name'), ''),
        NULLIF(TRIM(BOTH FROM user_row.raw_user_meta_data #>> '{user_metadata,display_name}'), ''),
        NULLIF(TRIM(BOTH FROM user_row.raw_user_meta_data #>> '{user_metadata,full_name}'), ''),
        identity_name,
        split_part(user_row.email, '@', 1)
      ),
      user_row.email,
      user_row.created_at,
      user_row.last_sign_in_at
    )
    ON CONFLICT (uid) DO UPDATE
    SET
      display_name = EXCLUDED.display_name,
      email = EXCLUDED.email,
      created_at = EXCLUDED.created_at,
      last_sign_in_at = EXCLUDED.last_sign_in_at;

    RAISE NOTICE 'Mirrored user % successfully', user_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error mirroring user %: %', user_id, SQLERRM;
    -- Silently ignore errors to prevent disrupting authentication
    NULL;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER on_auth_user_mirror_v2
AFTER INSERT OR UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.mirror_auth_user();