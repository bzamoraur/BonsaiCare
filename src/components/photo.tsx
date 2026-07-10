"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * A private-bucket image that prefers a small thumbnail rendition and falls back
 * to the full-size URL when there's no thumb (photos from before thumbnails
 * shipped) or the thumb fails to load. Both URLs are pre-signed server-side.
 * next/image doesn't fit short-lived signed URLs, so this is a plain <img> (S10.1).
 */
export function Photo({
  thumbSrc,
  fullSrc,
  alt,
  className,
  loading = "lazy",
  width,
  height,
}: {
  thumbSrc: string | null;
  fullSrc: string | null;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
  // The full image's intrinsic size — the thumb shares its aspect ratio, so these
  // reserve space and prevent layout shift regardless of which rendition loads.
  width?: number | null;
  height?: number | null;
}) {
  // Derive from props (not copied into state) so re-signed URLs stay live; a flag
  // records only that the thumb failed, so we don't loop between the two sources.
  const [thumbFailed, setThumbFailed] = useState(false);
  // When the thumb source changes (e.g. a fresh signed URL after router.refresh),
  // clear the failure so the card reclaims the thumb — a render-time reset rather
  // than an effect (the repo bans setState-in-effect, and this avoids an extra paint).
  const [lastThumb, setLastThumb] = useState(thumbSrc);
  if (thumbSrc !== lastThumb) {
    setLastThumb(thumbSrc);
    setThumbFailed(false);
  }
  const src = !thumbFailed && thumbSrc ? thumbSrc : fullSrc;

  if (!src) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- private signed URL, next/image caching doesn't fit
    <img
      src={src}
      alt={alt}
      loading={loading}
      width={width ?? undefined}
      height={height ?? undefined}
      onError={() => {
        // The thumb 404'd/expired → show the full image instead (once).
        if (!thumbFailed && thumbSrc && fullSrc && thumbSrc !== fullSrc) setThumbFailed(true);
      }}
      className={cn(className)}
    />
  );
}
