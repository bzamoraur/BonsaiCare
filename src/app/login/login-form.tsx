"use client";

import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "sending" | "sent" | "error";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

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
      setError(signInError.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  if (status === "sent") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
        <p className="text-muted-foreground max-w-sm text-balance">
          We sent a sign-in link to <span className="font-medium">{email}</span>. Open it on this
          device to continue.
        </p>
        <button
          type="button"
          className="text-muted-foreground text-sm underline underline-offset-4"
          onClick={() => {
            setStatus("idle");
            setError(null);
          }}
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Bonsai Companion</h1>
        <p className="text-muted-foreground text-balance">
          Sign in with your email — no password needed.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-3" noValidate>
        <label htmlFor="email" className="sr-only">
          Email address
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
          {status === "sending" ? "Sending…" : "Send magic link"}
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
