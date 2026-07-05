"use client";

import { Download } from "lucide-react";
import { useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Downloads a same-origin file WITHOUT navigating the page. A plain
 * `<a href download>` navigates a standalone PWA's only webview to the file URL
 * and leaves the user stranded with no back button. Instead we fetch the file
 * into a blob and trigger a download from an object URL, so the app never moves.
 */
export function DownloadButton({
  href,
  children,
  fallbackName,
}: {
  href: string;
  children: React.ReactNode;
  fallbackName: string;
}) {
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");

  async function handleDownload() {
    setStatus("working");
    try {
      const response = await fetch(href);
      if (!response.ok) throw new Error(await response.text());

      const disposition = response.headers.get("content-disposition") ?? "";
      const match = /filename="?([^"]+)"?/.exec(disposition);
      const filename = match?.[1] ?? fallbackName;

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleDownload}
        disabled={status === "working"}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}
      >
        <Download aria-hidden="true" />
        {status === "working" ? "Preparing…" : children}
      </button>
      {status === "error" ? (
        <span role="alert" className="text-destructive text-xs">
          Download failed. Please try again.
        </span>
      ) : null}
    </div>
  );
}
