"use client";

import { Check, Images, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { Photo } from "@/components/photo";
import { cn } from "@/lib/utils";

import { setCoverAction } from "./photo-actions";

type CoverPhoto = { id: string; url: string | null; thumbUrl: string | null };

/**
 * Lets the owner pick which photo is the tree's cover, straight from the hero — a
 * small overlay button opens a bottom sheet (the app's native-<dialog> pattern)
 * with the tree's photos. Tapping one submits setCoverAction; the sheet stays open
 * and the "Current" badge moves as the revalidated cover flows back in, so the
 * change is confirmed in place.
 */
export function ChangeCover({
  treeId,
  photos,
  coverPhotoId,
  className,
}: {
  treeId: string;
  photos: CoverPhoto[];
  coverPhotoId: string | null;
  className?: string;
}) {
  const t = useTranslations("cover");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

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
        className={cn(
          "bg-background/80 text-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur outline-none focus-visible:ring-2",
          className,
        )}
      >
        <Images className="size-3.5" aria-hidden />
        {t("change")}
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === dialogRef.current) setOpen(false);
        }}
        aria-labelledby="change-cover-title"
        className="bg-card text-foreground fixed inset-x-0 top-auto bottom-0 m-0 mx-auto max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border-0 p-0 backdrop:bg-black/50"
      >
        {open ? (
          <div className="flex flex-col gap-5 p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 id="change-cover-title" className="text-lg font-semibold tracking-tight">
                {t("title")}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring -mr-1 rounded-md p-1 outline-none focus-visible:ring-2"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <ul className="grid grid-cols-3 gap-2">
              {photos.map((photo) => {
                const isCover = photo.id === coverPhotoId;
                return (
                  <li key={photo.id}>
                    <form action={setCoverAction.bind(null, treeId, photo.id)}>
                      <button
                        type="submit"
                        aria-pressed={isCover}
                        className={cn(
                          "focus-visible:ring-ring bg-muted relative block w-full overflow-hidden rounded-lg outline-none focus-visible:ring-2",
                          isCover && "ring-primary ring-2",
                        )}
                      >
                        <Photo
                          thumbSrc={photo.thumbUrl}
                          fullSrc={photo.url}
                          alt=""
                          className="aspect-square w-full object-cover"
                        />
                        {isCover ? (
                          <span className="bg-primary text-primary-foreground absolute top-1 right-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-medium">
                            <Check className="size-3" aria-hidden />
                            {t("current")}
                          </span>
                        ) : null}
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
