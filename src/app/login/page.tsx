import { EmailForm } from "./email-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const rawNext = typeof params.next === "string" ? params.next : "/tasks";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/tasks";
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Neuron</h1>
        <p className="mt-1 mb-8 text-sm text-muted">
          Your tasks and events, in one place.
        </p>

        <EmailForm next={next} />

        {error ? (
          <p role="alert" className="mt-4 text-sm text-priority">
            Sign-in failed: {error}
          </p>
        ) : null}
      </div>
    </main>
  );
}
