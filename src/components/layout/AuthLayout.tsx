"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { CookieNotice } from "./CookieNotice";
import { FloatingUtilities } from "./FloatingUtilities";
import { HeaderBar } from "./HeaderBar";
import { SkipLink } from "@/components/ui/SkipLink";

/**
 * Shared shell for the auth family (sign in, sign up, recovery): global
 * header, a focused form and an editorial photo panel that connects sign-in
 * to the event-photo experience.
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
      <SkipLink targetId="auth-main" />
      <HeaderBar user={null} events={[]} />

      <main
        id="auth-main"
        tabIndex={-1}
        className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10 focus:outline-none sm:px-6 lg:py-14"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[440px] bg-[radial-gradient(ellipse_50%_60%_at_50%_40%,rgba(124,58,237,0.12),transparent_70%)]"
          aria-hidden="true"
        />

        <div className="relative grid w-full max-w-5xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <section className="auth-photo-panel relative hidden min-h-[520px] overflow-hidden rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl shadow-violet-950/20 lg:block lg:p-10">
            <Image
              src="/images/demo/gallery-03.webp"
              alt=""
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover opacity-65"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-slate-950/10" />
            <div className="relative flex h-full min-h-[452px] flex-col justify-between">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-medium text-white backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Every guest. Every angle.
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-200">
                  The moments you missed
                </p>
                <p className="mt-3 max-w-md text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
                  Your celebration, seen through everyone&apos;s eyes.
                </p>
                <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/75">
                  One simple gallery brings every candid, toast and happy tear together.
                </p>
              </div>
            </div>
          </section>

          <div className="mx-auto w-full max-w-md">
            <div className="mb-7 text-center lg:text-left">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">
                Your event studio
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">{title}</h1>
              {subtitle && <p className="mt-2.5 text-sm leading-relaxed text-slate-400 md:text-base">{subtitle}</p>}
            </div>

            <div className="rounded-[1.75rem] border border-slate-800 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-md sm:p-8">
              {children}
            </div>

            <p className="mt-5 text-center text-xs text-slate-500">
              Your photos stay yours. Guests don&apos;t need an account.
            </p>
          </div>
        </div>
      </main>

      <FloatingUtilities />
      <CookieNotice />
    </div>
  );
}

export default AuthLayout;
