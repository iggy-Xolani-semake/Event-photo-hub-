"use client";

import clsx from "clsx";
import { ArrowUp, Mail, MessageCircle, Phone, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/components/landing/usePrefersReducedMotion";
import { useBottomNoticeVisible } from "./noticeStore";

/**
 * The bottom-right utilities that appear on the public surfaces (landing,
 * legal pages, shared galleries): a back-to-top button and an expandable
 * contact button.
 *
 * Both are mounted together so they can never land on top of each other, and
 * both are `print:hidden`. They are also deliberately *not* mounted in the
 * guest upload flow (`/e/[code]`): that layout has a fixed bottom action bar
 * that owns the bottom edge on a phone, and covering it would hide the
 * primary "take photo" action.
 *
 * ## Contact destination
 *
 * WhatsApp and email come from `NEXT_PUBLIC_CONTACT_*` so the channels can be
 * changed per deployment, but both fall back to the operator's real details:
 * an unset env var on a fresh host should not silently remove the only way for
 * a paying client to reach a human. The fallback number lives here, in the one
 * component that uses it.
 */

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "nsxincorporated@gmail.com";
const CONTACT_WHATSAPP = process.env.NEXT_PUBLIC_CONTACT_WHATSAPP ?? "+27 79 126 9814";

/**
 * Normalise whatever form the number was configured in into `wa.me` digits.
 *
 * `wa.me` needs the full international number with no punctuation, and getting
 * it wrong fails silently — the button opens a chat with a number that does not
 * exist. Stripping non-digits is not enough, because the forms someone is
 * likely to type all look different once stripped:
 *
 *   "079 126 9814"     -> 0791269814    (local: needs the 27 prefix, or the
 *                                        link points at a number no network owns)
 *   "+27 79 126 9814"  -> 27791269814   (correct as-is)
 *   "0027 79 126 9814" -> 0027791269814 (international prefix: trim it)
 *   "27 79 126 9814"   -> 27791269814   (no plus, already international)
 */
export function normaliseWhatsApp(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");

  if (digits.startsWith("0027")) return digits.slice(2);
  if (digits.startsWith("27")) return digits;
  if (digits.startsWith("0")) return `27${digits.slice(1)}`;
  return digits;
}

/** The shapes wa.me accepts: E.164-ish, 8–15 digits, no leading zero. */
function isDialable(digits: string): boolean {
  return digits.length >= 8 && digits.length <= 15 && !digits.startsWith("0");
}

/**
 * A number that starts with South Africa's country code and still has the wrong
 * length is almost certainly a typo — a real SA mobile is `27` plus nine digits.
 * This is the mistake to watch for: `+27 79 612 698 14` (one digit too many)
 * and `+27 79 126 981` (one too few) both still *look* like phone numbers, and
 * `wa.me` would either reject them or dial a stranger.
 */
function looksLikeTypoSouthAfricanNumber(digits: string): boolean {
  return digits.startsWith("27") && digits.length !== 11;
}

// A number that cannot be dialled is a silent failure — the button renders
// fine and reaches nobody — so say so where a developer will see it. Development
// only: a console warning in production helps nobody.
if (process.env.NODE_ENV === "development" && CONTACT_WHATSAPP) {
  const normalised = normaliseWhatsApp(CONTACT_WHATSAPP);
  const suspect = looksLikeTypoSouthAfricanNumber(normalised) || !isDialable(normalised);

  if (suspect) {
    console.warn(
      `[contact] NEXT_PUBLIC_CONTACT_WHATSAPP="${CONTACT_WHATSAPP}" normalises to "${normalised}" ` +
        `(${normalised.length} digits), which ${looksLikeTypoSouthAfricanNumber(normalised) ? "is not a valid South African number — it should be 27 plus 9 digits" : "wa.me will not accept"}. ` +
        "Expected something like +27 79 126 9814."
    );
  }
}

/** The wa.me URL for the configured number, with a pre-filled question. */
function whatsappHref(raw: string): string {
  const digits = normaliseWhatsApp(raw);
  const message = encodeURIComponent("Hi Memora — I have a question about an event.");
  return `https://wa.me/${digits}?text=${message}`;
}

/**
 * Human-readable form of the number for the panel, so a host can save it to
 * their contacts before the chat opens. South African numbers get the
 * +27 XX XXX XXXX grouping; anything else is shown as typed rather than
 * mangled by a formatter that only knows one country.
 */
function whatsappLabel(raw: string): string {
  const digits = normaliseWhatsApp(raw);
  const match = /^27(\d{2})(\d{3})(\d{4})$/.exec(digits);
  if (match) return `+27 ${match[1]} ${match[2]} ${match[3]}`;
  return raw.trim();
}

export function FloatingUtilities({ className }: { className?: string }) {
  const reducedMotion = usePrefersReducedMotion();
  const noticeVisible = useBottomNoticeVisible();
  const [showTop, setShowTop] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const contactRef = useRef<HTMLDivElement | null>(null);

  // Back-to-top only earns its place once there is something to scroll back to.
  useEffect(() => {
    function onScroll() {
      setShowTop(window.scrollY > 600);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Dismiss the contact panel on Escape or a click outside it.
  useEffect(() => {
    if (!contactOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setContactOpen(false);
    }

    function onPointerDown(event: MouseEvent) {
      if (!contactRef.current?.contains(event.target as Node)) setContactOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [contactOpen]);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    // Keyboard users should land back on the page content, not stay on a
    // button that has just disappeared.
    document.getElementById("main")?.focus?.({ preventScroll: true });
  }

  return (
    <div
      className={clsx(
        "fixed bottom-5 right-4 z-40 flex-col items-end gap-3 print:hidden sm:bottom-6 sm:right-6",
        // On a phone the cookie notice owns the bottom of the screen; two
        // stacked overlays would cover each other's controls. The utilities
        // return as soon as the notice is acknowledged.
        noticeVisible ? "hidden sm:flex" : "flex",
        className
      )}
    >
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Back to top"
        title="Back to top"
        className={clsx(
          "flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900/90 text-slate-300 shadow-xl backdrop-blur-md transition-all",
          "hover:border-indigo-500/50 hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
          showTop ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
        )}
      >
        <ArrowUp className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
      </button>

      <div ref={contactRef} className="relative flex flex-col items-end gap-2">
        {contactOpen && (
          <div
            id="contact-panel"
            className="w-64 animate-slide-up rounded-2xl border border-slate-800 bg-slate-900/95 p-3 shadow-xl backdrop-blur-md"
          >
            <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Talk to a human
            </p>

            {CONTACT_WHATSAPP && (
              <>
                <a
                  href={whatsappHref(CONTACT_WHATSAPP)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800/70 hover:text-white"
                >
                  <MessageCircle className="h-4 w-4 shrink-0 text-emerald-400" strokeWidth={2.2} />
                  WhatsApp us
                </a>
                <p
                  className="truncate px-2.5 pb-1 text-[11px] text-slate-500"
                  title={whatsappLabel(CONTACT_WHATSAPP)}
                >
                  {whatsappLabel(CONTACT_WHATSAPP)}
                </p>
              </>
            )}

            <a
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Memora — question about my event")}`}
              className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800/70 hover:text-white"
            >
              <Mail className="h-4 w-4 shrink-0 text-indigo-400" strokeWidth={2.2} />
              Email us
            </a>

            <p className="mt-1 truncate px-2.5 pb-1 text-[11px] text-slate-500" title={CONTACT_EMAIL}>
              {CONTACT_EMAIL}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => setContactOpen((open) => !open)}
          aria-expanded={contactOpen}
          aria-controls="contact-panel"
          aria-label={contactOpen ? "Close contact options" : "Contact us"}
          title={contactOpen ? "Close contact options" : "Contact us"}
          className="brand-gradient flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg shadow-indigo-500/30 transition-all hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:scale-95"
        >
          {contactOpen ? (
            <X className="h-5 w-5" strokeWidth={2.4} aria-hidden="true" />
          ) : (
            <Phone className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}

export default FloatingUtilities;
