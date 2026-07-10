"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Photo } from "@/components/photo";
import { cn } from "@/lib/utils";

/**
 * A tappable photo that opens full-screen in a native `<dialog>` (focus trap,
 * Esc-to-close, the top layer, and focus-return come for free). The small
 * thumbnail shows inline; the full-size image is fetched only while open, so
 * tap-to-zoom never pre-loads full bytes — keeping the S10.1 thumbnail egress win.
 * Basic single-photo view; cross-photo swipe + then-vs-now compare are follow-ups.
 */
export function PhotoZoom({
  thumbSrc,
  fullSrc,
  alt,
  className,
  width,
  height,
}: {
  thumbSrc: string | null;
  fullSrc: string | null;
  alt: string;
  className?: string;
  width?: number | null;
  height?: number | null;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  // Drive the native modal from `open` (same pattern as the quick-add sheet).
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  // Lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={alt ? `View ${alt} full screen` : "View photo full screen"}
        className="focus-visible:ring-ring block w-full cursor-zoom-in rounded-[inherit] outline-none focus-visible:ring-2"
      >
        <Photo
          thumbSrc={thumbSrc}
          fullSrc={fullSrc}
          alt={alt}
          width={width}
          height={height}
          className={className}
        />
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          // A click on the backdrop (the dialog element itself) closes.
          if (e.target === dialogRef.current) setOpen(false);
        }}
        aria-label={alt || "Photo"}
        className="m-auto max-h-none max-w-none border-0 bg-transparent p-0 backdrop:bg-black/80"
      >
        {open ? (
          <div className="relative flex items-center justify-center">
            {fullSrc ? (
              // eslint-disable-next-line @next/next/no-img-element -- private signed URL, next/image caching doesn't fit
              <img
                src={fullSrc}
                alt={alt}
                className="max-h-[92vh] max-w-[96vw] rounded-lg object-contain"
              />
            ) : null}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className={cn(
                "bg-background/80 text-foreground focus-visible:ring-ring absolute top-2 right-2",
                "rounded-full p-2 shadow-md backdrop-blur outline-none focus-visible:ring-2",
              )}
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
