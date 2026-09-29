import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BRAND_OPTIONS, BrandMark } from "@/components/marketing/logoOptions";
import { MemoraMark } from "@/components/marketing/MemoraMark";

export const metadata: Metadata = {
  title: "Brand marks — Memora",
  // Never index a temporary design review page.
  robots: { index: false, follow: false },
};

/**
 * Design review page for the three candidate brand marks.
 *
 * Development only: it exists so the marks can be judged in the real theme with
 * the real font, at the real sizes (36px header tile, 16px favicon), rather
 * than from a flat PNG. It returns 404 in production, so it can stay in the
 * repo as documentation for how the internal logo page works.
 *
 * Delete this file once a mark is chosen.
 */
export default function BrandPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main id="main" className="min-h-screen bg-canvas px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Design review</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Brand marks</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
          Three directions, shown at the sizes the app actually uses. All three sit on the same
          40×40 grid and use the existing brand gradient (#7C3AED → #6366F1).
        </p>

        {/* Shipped. Keep this block first so the page answers its own question:
            which mark is live, and where. */}
        <section className="mt-8 rounded-2xl border border-indigo-500/40 bg-indigo-500/10 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
            Chosen · Option 2
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-8">
            <div className="flex items-end gap-4">
              <MemoraMark size={96} />
              <MemoraMark size={36} />
              <MemoraMark size={32} />
              <MemoraMark size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <MemoraMark size={36} />
                <span className="text-lg font-bold tracking-tight text-white">Memora</span>
              </div>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-300">
                Live in the header and footer, as the browser-tab icon
                (<code className="text-slate-400">src/app/icon.svg</code>), the Apple touch icon
                (<code className="text-slate-400">src/app/apple-icon.png</code>) and the social card
                (<code className="text-slate-400">src/app/opengraph-image.tsx</code>). Source of
                truth: <code className="text-slate-400">src/components/marketing/MemoraMark.tsx</code>
                — the SVG copies are generated from that geometry, never redrawn.
              </p>
            </div>
          </div>
        </section>

        <h2 className="mt-12 text-lg font-semibold tracking-tight text-white">
          The other two directions
        </h2>
        <div className="mt-6 space-y-6">
          {BRAND_OPTIONS.map((option, index) => (
            <section
              key={option.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                    Option {index + 1}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">
                    {option.name}
                  </h2>
                  <p className="mt-1.5 max-w-lg text-sm text-slate-400">{option.idea}</p>
                  <p className="mt-2 max-w-lg text-xs text-slate-500">{option.note}</p>
                </div>

                {/* Icon-only, large: the mark on its own. */}
                <div className="flex items-center gap-5 rounded-2xl border border-slate-800 bg-canvas px-6 py-5">
                  <BrandMark id={option.id} size={96} />
                </div>
              </div>

              {/* Lockup + the two real-world scales. */}
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-800 bg-canvas p-5">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Header lockup
                  </p>
                  <div className="flex items-center gap-2.5">
                    <BrandMark id={option.id} size={36} />
                    <span className="text-lg font-bold tracking-tight text-white">Memora</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-canvas p-5">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Footer
                  </p>
                  <div className="flex items-center gap-2.5">
                    <BrandMark id={option.id} size={32} />
                    <div>
                      <p className="text-sm font-bold tracking-tight text-white">Memora</p>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">
                        Event photo sharing
                      </p>
                    </div>
                  </div>
                </div>

                {/* 16px is the honest test: the browser tab, a QR poster corner. */}
                <div className="rounded-xl border border-slate-800 bg-canvas p-5">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Favicon scale (16px)
                  </p>
                  <div className="flex items-end gap-4">
                    <BrandMark id={option.id} size={16} />
                    <BrandMark id={option.id} size={24} />
                    <BrandMark id={option.id} size={32} />
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>

        <p className="mt-10 text-xs text-slate-500">
          This page is development-only (it 404s in production) and exists purely to choose a mark.
        </p>
      </div>
    </main>
  );
}
