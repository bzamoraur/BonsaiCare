"use client";

import { useTranslations } from "next-intl";
import { type FormEvent, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "sending" | "sent" | "error";
type VerifyStatus = "idle" | "verifying" | "error";

export function LoginForm() {
  const t = useTranslations("login");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  // Code fallback (see handleVerify): the 6-digit code the same email carries.
  const [code, setCode] = useState("");
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>("idle");
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // On the swap to the "sent" view the focused submit button unmounts and focus
  // would fall to <body>; move it to the new heading so keyboard/SR users are
  // told the screen changed and land next to the code input.
  const sentHeadingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (status === "sent") sentHeadingRef.current?.focus();
  }, [status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: true,
      },
    });

    if (signInError) {
      // A localized generic — the raw provider message is English-only and can
      // leak rate-limit timing.
      setError(t("sendError"));
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  // The magic link's PKCE verifier lives in this browser's cookies, so a link
  // opened in a DIFFERENT browser (e.g. an iPhone mail app's in-app browser)
  // fails to sign in. Verifying the emailed code instead is a direct token
  // exchange — no PKCE cookie needed — so it works in the browser that started
  // the flow. verifyOtp writes the session to cookies; a full navigation then
  // lets the server (proxy + RSC) pick it up.
  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVerifyStatus("verifying");
    setVerifyError(null);

    const supabase = createClient();
    const { data, error: otpError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (otpError || !data.session) {
      setVerifyError(t("codeError"));
      setVerifyStatus("error");
    } else {
      window.location.assign("/today");
    }
  }

  function resetToEmail() {
    setStatus("idle");
    setError(null);
    setEmail("");
    setCode("");
    setVerifyStatus("idle");
    setVerifyError(null);
  }

  if (status === "sent") {
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <div className="flex flex-col gap-2">
          <h1
            ref={sentHeadingRef}
            tabIndex={-1}
            className="text-2xl font-semibold tracking-tight outline-none"
          >
            {t("checkEmailTitle")}
          </h1>
          <p className="text-muted-foreground text-balance">
            {t.rich("sentBody", {
              email,
              b: (chunks) => <span className="font-medium">{chunks}</span>,
            })}
          </p>
          <p className="text-muted-foreground text-sm text-balance">{t("sentHint")}</p>
        </div>

        <form onSubmit={handleVerify} className="flex w-full flex-col gap-3">
          <label htmlFor="code" className="text-muted-foreground text-sm">
            {t("codePrompt")}
          </label>
          <input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            disabled={verifyStatus === "verifying"}
            className="border-input bg-background focus-visible:ring-ring h-11 rounded-md border px-3 text-center text-lg tracking-[0.4em] outline-none focus-visible:ring-2 disabled:opacity-50"
          />
          <Button type="submit" disabled={verifyStatus === "verifying" || code.length !== 6}>
            {verifyStatus === "verifying" ? t("verifying") : t("verify")}
          </Button>
          {verifyStatus === "error" && verifyError ? (
            <p role="alert" className="text-destructive text-sm">
              {verifyError}
            </p>
          ) : null}
        </form>

        <button
          type="button"
          className="text-muted-foreground text-sm underline underline-offset-4"
          onClick={resetToEmail}
        >
          {t("useDifferentEmail")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Bonsai Companion</h1>
        <p className="text-muted-foreground text-balance">{t("subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-3" noValidate>
        <label htmlFor="email" className="sr-only">
          {t("emailLabel")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={status === "sending"}
          className="border-input bg-background focus-visible:ring-ring h-11 rounded-md border px-3 text-base outline-none focus-visible:ring-2 disabled:opacity-50"
        />
        <Button type="submit" disabled={status === "sending" || email.length === 0}>
          {status === "sending" ? t("sending") : t("sendLink")}
        </Button>
        {status === "error" && error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}
