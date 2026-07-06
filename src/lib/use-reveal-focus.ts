"use client";

import { type RefObject, useEffect, useRef } from "react";

/**
 * Focus management for an inline reveal/collapse control. When `open` flips to
 * true, focus the revealed element; when it flips back to false, focus the
 * trigger — so keyboard/AT focus is never dumped to <body> as React unmounts the
 * focused element. Only fires on a transition (never on first render), so it
 * can't steal focus on load; a null ref simply no-ops (today's behavior).
 *
 * Attach `triggerRef` to the trigger and `revealRef` to the element that should
 * take focus on reveal — for a destructive confirm, the Cancel button, so a
 * stray Enter can't destroy data.
 */
export function useRevealFocus<
  Trigger extends HTMLElement = HTMLButtonElement,
  Reveal extends HTMLElement = HTMLElement,
>(
  open: boolean,
): {
  triggerRef: RefObject<Trigger | null>;
  revealRef: RefObject<Reveal | null>;
} {
  const triggerRef = useRef<Trigger>(null);
  const revealRef = useRef<Reveal>(null);
  const previous = useRef(open);

  useEffect(() => {
    if (open && !previous.current) revealRef.current?.focus();
    else if (!open && previous.current) triggerRef.current?.focus();
    previous.current = open;
  }, [open]);

  return { triggerRef, revealRef };
}
