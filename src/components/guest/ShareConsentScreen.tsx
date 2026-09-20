interface Props {
  onConfirm: () => void;
  onBack: () => void;
}

/**
 * FROG #7 — one honest sentence about what sharing means here, shown once
 * per visit before the photo picker opens.
 *
 * This is deliberately NOT presented as a POPIA solution. It is a
 * plain-language warning at the moment of decision, which is the only
 * point where it can actually change behaviour. The real POPIA work
 * (lawful basis, retention, signage at the venue, takedown) is tracked
 * separately in docs/LEGAL_REVIEW_NEEDED.md.
 */
export function ShareConsentScreen({ onConfirm, onBack }: Props) {
  return (
    <main className="min-h-screen px-6 pb-8 pt-12">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md flex-col">
        <h1 className="font-display text-3xl leading-tight">Before you share</h1>

        <div className="mt-8 space-y-4 text-base leading-relaxed text-white/70">
          <p>
            Only upload photos you&apos;re comfortable sharing with everyone who
            has this event&apos;s link.
          </p>
          <p>Please don&apos;t upload private, sensitive or inappropriate images.</p>
          <p>
            You don&apos;t need an account, and we don&apos;t ask for your name, email
            or phone number.
          </p>
        </div>

        <div className="mt-auto flex flex-col gap-3 pt-10">
          <button
            type="button"
            onClick={onConfirm}
            className="tap-target w-full rounded-2xl bg-accent px-6 py-4 text-lg font-semibold text-ink-950 shadow-lg shadow-accent/20 transition-transform active:scale-[0.98]"
          >
            I understand
          </button>
          <button
            type="button"
            onClick={onBack}
            className="tap-target w-full rounded-2xl px-6 py-3 text-base font-medium text-white/60"
          >
            Back
          </button>
          <p className="text-center text-xs text-white/25">
            <a href="/privacy" className="underline">
              Read the full privacy notice
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
