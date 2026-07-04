/**
 * Client-side image compression. Downscales to a max edge and re-encodes to WebP
 * so uploads stay small (a personal collection lives comfortably in the free
 * storage tier). Runs entirely in the browser — only import from Client
 * Components. EXIF orientation is honoured so phone photos aren't rotated.
 */
export type CompressedImage = { blob: Blob; width: number; height: number };

export async function compressImage(
  file: File,
  maxEdge = 1600,
  quality = 0.82,
): Promise<CompressedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser can't process images here.");
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality),
    );
    if (!blob) throw new Error("We couldn't process that image.");
    return { blob, width, height };
  } finally {
    bitmap.close();
  }
}
