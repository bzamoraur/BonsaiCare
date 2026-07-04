-- ============================================================================
-- Harden the private tree-photos bucket with server-side guardrails.
--
-- The uploader compresses to WebP client-side, but an authenticated user could
-- call the Storage API directly and drop an arbitrarily large / non-image blob
-- under their own prefix (Storage RLS only constrains the path, not size/type).
-- Bound that abuse (and storage cost) at the bucket level. Self-scoped either
-- way, but now finite. WebP is what the app uploads; JPEG/PNG are allowed so a
-- future direct/native upload path still works.
-- ============================================================================
update storage.buckets
set
  file_size_limit = 5242880, -- 5 MB
  allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png']
where id = 'tree-photos';
