import { Zip, ZipPassThrough } from "fflate";

import { photoEntryName } from "@/lib/photo-archive-name";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /settings/export/photos — downloads every photo object as a zip (ADR-0008:
 * the visual progression must not be trapped).
 *
 * The archive is built by **streaming**: each object is fetched from Storage and
 * piped straight into a store-method zip (images are already compressed, so no
 * re-deflate) via a Web ReadableStream. Memory stays bounded to roughly one
 * object at a time, and the download starts immediately — this is what keeps it
 * inside Vercel Hobby's function budget (maxDuration below).
 *
 * For an unusually large collection we fall back to a signed-URL **manifest**
 * (JSON) rather than risk the time budget mid-stream. RLS scopes every read to
 * the owner; a missing object is skipped so one gap never fails the whole export.
 */
export const maxDuration = 60;

const BUCKET = "tree-photos";
const MAX_STREAM_PHOTOS = 500; // beyond this, return a manifest (time budget)
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export async function GET(): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const [photosRes, treesRes] = await Promise.all([
    supabase
      .from("photos")
      .select("id, storage_path, taken_at, tree_id")
      .eq("owner_id", user.id)
      .order("taken_at", { ascending: true }),
    supabase.from("trees").select("id, name").eq("owner_id", user.id),
  ]);
  if (photosRes.error) return new Response(photosRes.error.message, { status: 500 });
  if (treesRes.error) return new Response(treesRes.error.message, { status: 500 });

  const photos = photosRes.data ?? [];
  const treeName = new Map((treesRes.data ?? []).map((t) => [t.id, t.name]));
  const date = new Date().toISOString().slice(0, 10);

  const nameFor = (p: (typeof photos)[number], used: Set<string>) =>
    photoEntryName(
      {
        treeName: treeName.get(p.tree_id) ?? null,
        storagePath: p.storage_path,
        takenAt: p.taken_at,
        id: p.id,
      },
      used,
    );

  // Large collection → manifest of temporary links instead of a single archive.
  if (photos.length > MAX_STREAM_PHOTOS) {
    const { data: signed, error } = await supabase.storage.from(BUCKET).createSignedUrls(
      photos.map((p) => p.storage_path),
      SIGNED_URL_TTL_SECONDS,
    );
    if (error) return new Response(error.message, { status: 500 });

    const used = new Set<string>();
    const manifest = {
      note: "Your collection is large, so this lists temporary download links instead of one archive. Links expire in 1 hour — re-export for fresh links.",
      generated_at: new Date().toISOString(),
      expires_in_seconds: SIGNED_URL_TTL_SECONDS,
      count: photos.length,
      photos: photos.map((p, i) => ({
        file: nameFor(p, used),
        taken_at: p.taken_at,
        url: signed?.[i]?.signedUrl ?? null,
      })),
    };
    return new Response(JSON.stringify(manifest, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="bonsai-photos-${date}-manifest.json"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const used = new Set<string>();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const zip = new Zip((err, chunk, final) => {
        if (err) {
          controller.error(err);
          return;
        }
        if (chunk.length) controller.enqueue(chunk);
        if (final) controller.close();
      });

      void (async () => {
        try {
          for (const p of photos) {
            const { data: blob, error } = await supabase.storage
              .from(BUCKET)
              .download(p.storage_path);
            if (error || !blob) continue; // skip a missing object; the archive still completes
            const bytes = new Uint8Array(await blob.arrayBuffer());
            const entry = new ZipPassThrough(nameFor(p, used));
            zip.add(entry);
            entry.push(bytes, true);
          }
          zip.end();
        } catch (streamError) {
          controller.error(streamError as Error);
        }
      })();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="bonsai-photos-${date}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
