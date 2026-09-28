"use client";

import type { ReactNode } from "react";
import { HeaderBar } from "./HeaderBar";

/**
 * Shared shell for the auth family (sign in, sign up, recovery): global
 * header, one centred glass card, and a soft indigo glow so the form is the
 * only thing competing for attention.
 *
 * Client component on purpose — the auth pages are client forms, so the
 * header is rendered in its guest variant directly (signed-in visitors are
 * redirected away from these routes by middleware/page logic anyway).
 */
export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas">
      <HeaderBar user={null} events={[]} />

      <main className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12 sm:px-6">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[360px] bg-[radial-gradient(ellipse_50%_60%_at_50%_40%,rgba(124,58,237,0.16),transparent_70%)]"
          aria-hidden="true"
        />

        <div className="relative w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">{title}</h1>
            {subtitle && <p className="mt-2.5 text-sm text-slate-400 md:text-base">{subtitle}</p>}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md sm:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

export default AuthLayout;
