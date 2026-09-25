"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { authenticate } from "./actions";
import { initialAuthState } from "./auth-state";

function SubmitButton({ signingUp }: { signingUp: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
    >
      {pending
        ? signingUp
          ? "Creating account…"
          : "Signing in…"
        : signingUp
          ? "Create account"
          : "Sign in"}
    </button>
  );
}

export function EmailForm({ next }: { next: string }) {
  const [signingUp, setSigningUp] = useState(false);
  const [state, formAction] = useActionState(authenticate, initialAuthState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="intent" value={signingUp ? "signup" : "signin"} />

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted">Email</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          className="rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:ring-2 focus:ring-accent/40"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted">Password</span>
        <input
          type="password"
          name="password"
          autoComplete={signingUp ? "new-password" : "current-password"}
          required
          minLength={signingUp ? 8 : undefined}
          className="rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:ring-2 focus:ring-accent/40"
        />
        {signingUp ? (
          <span className="text-xs text-muted">At least 8 characters.</span>
        ) : null}
      </label>

      <SubmitButton signingUp={signingUp} />

      {state.error ? (
        <p role="alert" className="text-sm text-priority">
          {state.error}
        </p>
      ) : null}

      {state.notice ? (
        <p role="status" className="text-sm text-accent">
          {state.notice}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => setSigningUp((v) => !v)}
        className="self-start text-xs text-muted underline decoration-dotted underline-offset-2 transition hover:text-foreground"
      >
        {signingUp
          ? "Already have an account? Sign in"
          : "First time here? Create an account"}
      </button>
    </form>
  );
}
