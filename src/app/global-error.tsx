"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 p-8 text-white">
        <main className="mx-auto max-w-lg pt-20">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="mt-3 text-slate-300">
            Please try again. If the problem continues, contact support.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 rounded-lg bg-indigo-600 px-4 py-2 font-medium hover:bg-indigo-500"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
