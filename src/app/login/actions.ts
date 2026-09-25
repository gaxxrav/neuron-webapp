"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  error: string | null;
  notice: string | null;
};

export const initialAuthState: AuthState = { error: null, notice: null };

/** Only ever redirect to a path on this app, never an attacker-supplied host. */
function safePath(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/tasks";
}

export async function authenticate(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const signingUp = formData.get("intent") === "signup";
  const next = safePath(formData.get("next"));

  if (!email || !password) {
    return { error: "Enter your email and password.", notice: null };
  }
  if (signingUp && password.length < 8) {
    return { error: "Use at least 8 characters.", notice: null };
  }

  const supabase = await createClient();

  if (signingUp) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message, notice: null };

    // No session means the project still has email confirmation switched on.
    if (!data.session) {
      return {
        error: null,
        notice: "Check your email to confirm the account, then sign in.",
      };
    }
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message, notice: null };
  }

  // Throws internally to perform the redirect, so it must sit outside any
  // try/catch and after every early return.
  redirect(next);
}
