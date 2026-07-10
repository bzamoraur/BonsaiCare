/**
 * Derive a photo's thumbnail object path from its full-size storage path. Thumbs
 * are a sibling object (`…/{uuid}.thumb.webp`) written alongside the full image at
 * upload — a naming convention, so there's no schema column to add. Only photos
 * uploaded since thumbnails shipped have one; readers fall back to the full image
 * for older photos (their thumb path simply won't sign).
 */
export function thumbPath(storagePath: string): string {
  return storagePath.replace(/\.webp$/i, "") + ".thumb.webp";
}
