"use client";

import { Camera, NotebookPen, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import { PhotoUploader } from "@/app/(app)/collection/[id]/photo-uploader";
import { CareEntryFields, type CareDefaults } from "@/components/care-entry-fields";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { LogCareState } from "@/app/(app)/collection/[id]/care-types";
import {
  getQuickAddData,
  quickLogCareAction,
  type QuickAddData,
} from "@/app/(app)/log/quick-actions";

const CARE_DEFAULTS: CareDefaults = {
  type: "watering",
  occurredAtDate: "",
  title: "",
  notes: "",
  details: {},
};
const initialCare: LogCareState = { status: "idle" };

type Mode = "care" | "photo";
type LoadState =
  { status: "loading" } | { status: "ready"; data: QuickAddData } | { status: "error" };

/**
 * The global quick-add: a bottom sheet (native `<dialog>`, so focus trapping,
 * Esc-to-close, the top layer, and focus-return come for free) reached from the
 * nav's "+". Pick a tree, then log care or add a photo — without ever loading the
 * full tree profile (audit finding #5). Controlled by `AppNav`, which also closes
 * it on navigation.
 *
 * The `<dialog>` stays mounted (its ref drives showModal/close), but the body is
 * rendered only while open — so every open starts fresh (no stale "Logged ✓"/error
 * banner, mode, or tree selection carried over from a prior session).
 */
export function QuickAddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Drive the native modal from the `open` prop. showModal() gives us the top
  // layer (above the fixed nav), focus trapping, Esc, and focus-return to the "+".
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  // Lock background scroll while open (showModal doesn't on every browser).
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // The backdrop is the dialog element itself (the panel is a child): a click that
  // lands on it — not on the panel — closes the sheet.
  function handleDialogClick(event: React.MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={handleDialogClick}
      aria-labelledby="quick-add-title"
      className="bg-card text-foreground fixed inset-x-0 top-auto bottom-0 m-0 mx-auto max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border-0 p-0 backdrop:bg-black/50"
    >
      {open ? <QuickAddBody onClose={onClose} /> : null}
    </dialog>
  );
}

/** The sheet's contents — mounted only while open, so its state resets each time. */
function QuickAddBody({ onClose }: { onClose: () => void }) {
  const t = useTranslations("quickAdd");
  const tCommon = useTranslations("common");
  const tPhoto = useTranslations("photo");
  const careFormRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [treeId, setTreeId] = useState("");
  const [mode, setMode] = useState<Mode>("care");
  const [careState, careAction, carePending] = useActionState(quickLogCareAction, initialCare);

  // Load trees + user id on mount (i.e. each time the sheet opens). setState lives
  // only in the async callbacks (never synchronously in the effect body).
  useEffect(() => {
    let active = true;
    getQuickAddData()
      .then((next) => {
        if (!active) return;
        setLoad({ status: "ready", data: next });
        // Preselect when there's exactly one tree.
        if (next.trees.length === 1) setTreeId(next.trees[0].id);
      })
      .catch(() => {
        if (active) setLoad({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, []);

  // After a successful care log, clear the fields but keep the sheet open (log the
  // next tree in one tap) and refresh the underlying page to show the new entry.
  useEffect(() => {
    if (careState.status === "success") {
      careFormRef.current?.reset();
      router.refresh();
    }
  }, [careState, router]);

  const trees = load.status === "ready" ? load.data.trees : [];
  const userId = load.status === "ready" ? load.data.userId : null;
  const treeChosen = Boolean(treeId) && trees.some((t) => t.id === treeId);

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 id="quick-add-title" className="text-lg font-semibold tracking-tight">
          {t("title")}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={tCommon("close")}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring -mr-1 rounded-md p-1 outline-none focus-visible:ring-2"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      {load.status === "loading" ? (
        <p className="text-muted-foreground text-sm">{t("loading")}</p>
      ) : load.status === "error" ? (
        <p role="alert" className="text-destructive text-sm">
          {t("loadError")}
        </p>
      ) : trees.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-muted-foreground text-sm text-balance">{t("noTrees")}</p>
          <Link
            href="/collection/new"
            className={cn("text-primary text-sm font-medium underline-offset-4 hover:underline")}
          >
            {t("addTree")}
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="quick-tree" className="text-sm font-medium">
              {t("whichTree")}
            </label>
            <select
              id="quick-tree"
              value={treeId}
              onChange={(e) => setTreeId(e.target.value)}
              className="border-input bg-background focus-visible:ring-ring h-10 rounded-md border px-3 text-base outline-none focus-visible:ring-2"
            >
              <option value="">{t("selectTree")}</option>
              {trees.map((tree) => (
                <option key={tree.id} value={tree.id}>
                  {tree.name}
                </option>
              ))}
            </select>
          </div>

          {/* Care vs. photo — a segmented control. */}
          <div
            className="bg-muted flex gap-1 rounded-lg p-1"
            role="group"
            aria-label={t("whatToAdd")}
          >
            <ModeButton active={mode === "care"} onClick={() => setMode("care")} icon={NotebookPen}>
              {t("logCare")}
            </ModeButton>
            <ModeButton active={mode === "photo"} onClick={() => setMode("photo")} icon={Camera}>
              {tPhoto("addPhoto")}
            </ModeButton>
          </div>

          {mode === "care" ? (
            <form ref={careFormRef} action={careAction} className="flex flex-col gap-4">
              <input type="hidden" name="treeId" value={treeId} />
              <CareEntryFields defaults={CARE_DEFAULTS} idPrefix="quick-care" />
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={!treeChosen || carePending}>
                  {carePending ? t("logging") : t("logIt")}
                </Button>
                <span role="status" aria-live="polite" className="text-primary text-sm">
                  {careState.status === "success" ? t("logged") : ""}
                </span>
                {careState.status === "error" ? (
                  <span role="alert" className="text-destructive text-sm">
                    {careState.message}
                  </span>
                ) : null}
              </div>
            </form>
          ) : treeChosen && userId ? (
            <div className="flex flex-col items-start gap-2">
              <PhotoUploader treeId={treeId} ownerId={userId} />
              <p className="text-muted-foreground text-xs">{t("photoNote")}</p>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">{t("pickTreeForPhoto")}</p>
          )}
        </>
      )}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Camera;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "focus-visible:ring-ring flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-4" aria-hidden />
      {children}
    </button>
  );
}
