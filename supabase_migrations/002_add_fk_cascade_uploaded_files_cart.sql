-- Adds FK constraint so deleting a cart row cascades to uploaded_files.
-- Safe-guard: only create if it does not already exist.
-- Also backfills any existing uploaded_files rows whose cart_id points to a non‑existent cart (sets cart_id NULL).

BEGIN;

-- Backfill: null out cart_id values referencing missing cart rows to avoid FK violation on constraint creation
UPDATE uploaded_files uf
SET cart_id = NULL
WHERE cart_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM cart c WHERE c.cart_id = uf.cart_id
  );

-- Create index on uploaded_files.cart_id if missing (helps delete cascade performance)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uploaded_files_cart_id_idx'
    ) THEN
        CREATE INDEX uploaded_files_cart_id_idx ON public.uploaded_files(cart_id);
    END IF;
END$$;

-- Add the foreign key with ON DELETE CASCADE if not already present
DO $$
DECLARE
    fk_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'uploaded_files'
          AND tc.constraint_name = 'uploaded_files_cart_id_fkey'
    ) INTO fk_exists;

    IF NOT fk_exists THEN
        ALTER TABLE public.uploaded_files
        ADD CONSTRAINT uploaded_files_cart_id_fkey
        FOREIGN KEY (cart_id)
        REFERENCES public.cart(cart_id)
        ON DELETE CASCADE;
    END IF;
END$$;

COMMIT;

-- NOTE: Storage objects are NOT automatically deleted by this FK. Your existing application code in Cart-Page.jsx
-- still attempts to remove the physical files. The cascade only cleans up the DB rows if the cart row is deleted directly.
