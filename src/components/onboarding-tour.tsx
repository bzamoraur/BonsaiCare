"use client";

import { GalleryVerticalEnd, NotebookPen, Sprout, X, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { markOnboardingSeen } from "@/app/(app)/onboarding-actions";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  isFirstStep,
  isLastStep,
  nextStep,
  prevStep,
  TOUR_STEPS,
  type TourStepId,
} from "@/domain/tour";
import { cn } from "@/lib/utils";

/**
 * DOM event the Settings "replay" control dispatches to re-open the tour. Both
 * components live in the persistent (app) shell, so a plain window event is the
 * lightest zero-dependency channel between them — no shared provider, no DB write,
 * no navigation.
 */
export const OPEN_ONBOARDING_EVENT = "bonsai:open-onboarding";

const STEP_ICONS: Record<TourStepId, LucideIcon> = {
  addTree: Sprout,
  logCare: NotebookPen,
  timeline: GalleryVerticalEnd,
};

/**
 * First-run onboarding tour: a short, skippable, centered modal carousel
 * (add a tree → log care → read the timeline). Built on the native `<dialog>`
 * element — focus trapping, Esc-to-close, the top layer, and focus-return come for
 * free — the same zero-dependency modal primitive as the quick-add sheet.
 *
 * Mounted once in the authenticated shell ((app)/layout). It auto-opens for a user
 * who hasn't dismissed it (`initialOpen`, derived server-side from
 * profiles.onboarding_seen_at so returning users get no flash), and re-opens on
 * demand from Settings via OPEN_ONBOARDING_EVENT. Every dismissal path — finishing,
 * Skip/close, Esc, or a backdrop click — records the flag once, and only for a
 * genuine first run (a Settings replay never re-writes it).
 */
export function OnboardingTour({ initialOpen }: { initialOpen: boolean }) {
  const t = useTranslations("onboarding");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(initialOpen);
  const [index, setIndex] = useState(0);
  // Persist "seen" at most once, and only when this was the first-run auto-open.
  const markedRef = useRef(false);

  // Re-open from the Settings "replay" control (rendered elsewhere in the shell).
  useEffect(() => {
    function reopen() {
      setIndex(0);
      setOpen(true);
    }
    window.addEventListener(OPEN_ONBOARDING_EVENT, reopen);
    return () => window.removeEventListener(OPEN_ONBOARDING_EVENT, reopen);
  }, []);

  // Drive the native modal from `open`. showModal() gives the top layer (above the
  // fixed nav), focus trapping, Esc, and focus-return.
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  // Lock background scroll while open (parity with the quick-add sheet).
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  function dismiss() {
    if (initialOpen && !markedRef.current) {
      markedRef.current = true;
      void markOnboardingSeen();
    }
    setOpen(false);
  }

  // The backdrop is the dialog element itself (the panel is a child): a click that
  // lands on it — not on the panel — dismisses the tour.
  function handleDialogClick(event: React.MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) dismiss();
  }

  const stepId = TOUR_STEPS[index];
  const Icon = STEP_ICONS[stepId];
  const last = isLastStep(index);

  return (
    <dialog
      ref={dialogRef}
      onClose={dismiss}
      onClick={handleDialogClick}
      aria-labelledby="onboarding-title"
      className="bg-card text-foreground m-auto w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border-0 p-0 shadow-lg backdrop:bg-black/50"
    >
      {open ? (
        <div className="flex flex-col gap-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {t("eyebrow")}
            </p>
            <button
              type="button"
              onClick={dismiss}
              aria-label={t("skipAria")}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring -mt-1 -mr-1 rounded-md p-1 outline-none focus-visible:ring-2"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>

          <div className="flex flex-col items-center gap-4 text-center" aria-live="polite">
            <span
              className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-full"
              aria-hidden
            >
              <Icon className="size-7" />
            </span>
            <h2
              id="onboarding-title"
              className="font-heading text-xl font-semibold tracking-tight text-balance"
            >
              {t(`${stepId}Title`)}
            </h2>
            <p className="text-muted-foreground text-sm text-balance">{t(`${stepId}Body`)}</p>
          </div>

          {/* Progress dots — decorative; the eyebrow + buttons convey state to AT. */}
          <div className="flex items-center justify-center gap-1.5" aria-hidden>
            {TOUR_STEPS.map((id, i) => (
              <span
                key={id}
                className={cn(
                  "size-1.5 rounded-full transition-colors",
                  i === index ? "bg-primary" : "bg-muted-foreground/30",
                )}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIndex(prevStep(index))}
              className={cn(isFirstStep(index) && "invisible")}
            >
              {t("back")}
            </Button>
            {last ? (
              <Link
                href="/collection/new"
                onClick={dismiss}
                className={cn(buttonVariants({ variant: "default" }))}
              >
                {t("finish")}
              </Link>
            ) : (
              <Button type="button" onClick={() => setIndex(nextStep(index))}>
                {t("next")}
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
