// Kept out of actions.ts: a "use server" module may only export async
// functions, so shared values and types have to live somewhere else.

export type AuthState = {
  error: string | null;
  notice: string | null;
};

export const initialAuthState: AuthState = { error: null, notice: null };
