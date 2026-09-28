import Link from "next/link";
import { AppFooter } from "@/components/layout/AppFooter";
import { AppHeader } from "@/components/layout/AppHeader";

export const metadata = { title: "Terms of Service — Memora" };

/**
 * Terms of Service.
 *
 * Mirrors the structure and voice of /privacy/page.tsx on purpose: both are
 * plain components a non-developer can edit, and both carry the same
 * "LEGAL REVIEW NEEDED" markers until a South African lawyer has signed them
 * off (see docs/LEGAL_REVIEW_NEEDED.md). Nothing here should be treated as
 * final legal advice.
 */
export default function TermsOfServicePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 leading-relaxed text-slate-400">

      <h1 className="mt-2 mb-2 text-3xl font-bold tracking-tight text-white md:text-4xl">Terms of Service</h1>
      <p className="text-slate-500 text-sm mb-10">Last updated: 28 September 2026</p>

      <Section title="Who these terms cover">
        <p>
          This service is operated by <strong>NSX Inc</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;).
          These terms apply to event hosts (&ldquo;clients&rdquo;) who create a gallery, and to the
          guests whose photographs are collected through it. By creating an event, purchasing an
          event pass, or uploading a photograph, you agree to these terms.
        </p>
        <p className="mt-3 text-slate-500 text-sm">
          [LEGAL REVIEW NEEDED: confirm the contracting entity, jurisdiction and whether guests
          need to accept terms explicitly at upload time rather than implicitly.]
        </p>
      </Section>

      <Section title="Your host account">
        <p>
          You are responsible for keeping your sign-in details secure and for every event created
          under your account. Event codes and share links are bearer credentials — anyone holding
          the link to a shared or public gallery can view it, so choose the visibility setting that
          matches your event.
        </p>
      </Section>

      <Section title="Creating an event and the QR poster">
        <p>
          You may create an event free of charge. Each event includes a printable QR poster and a
          shareable link. You are responsible for the accuracy of the event details you enter and
          for how widely you distribute the code or poster.
        </p>
      </Section>

      <Section title="Guest uploads">
        <ul className="list-disc pl-5 space-y-1.5 mt-2">
          <li>
            Guests upload without creating an account. Their session is held in a browser cookie
            and is scoped to the single event they scanned.
          </li>
          <li>
            By uploading, a guest confirms they took the photograph or have the right to share it,
            and they grant the event host and us a licence to store, display and reproduce it for
            the purpose of running that event&apos;s gallery.
          </li>
          <li>
            Uploads are limited per event and per guest. Attempts to exceed the configured limits
            are rejected rather than silently truncated.
          </li>
        </ul>
        <p className="mt-3">
          Nudity, illegal content, hate speech, and anything that infringes a third party&apos;s
          rights are prohibited. We may remove such content and suspend an event without notice.
        </p>
      </Section>

      <Section title="The event pass and payment">
        <p>
          Browsing the gallery and its WebP preview thumbnails is free. Unlocking the original
          high-resolution photographs as a ZIP download requires a paid event pass. A pass applies
          to one event only, is charged once, and does not renew.
        </p>
        <p className="mt-3 text-slate-500 text-sm">
          [LEGAL REVIEW NEEDED: refund policy, chargeback handling and whether a pass transfers if
          an event is duplicated or its date changes.]
        </p>
      </Section>

      <Section title="Storage windows">
        <p>
          Uploads remain open for 7 days after the event date, and the gallery remains accessible
          for 30 days. After that window photographs may be permanently deleted, so download the
          originals you want to keep before it closes. We are not a long-term archive.
        </p>
      </Section>

      <Section title="Availability">
        <p>
          We aim for the service to be available throughout your event, but it is provided
          &ldquo;as is&rdquo;. Network conditions at a venue are outside our control, and we do not
          guarantee uninterrupted service. Where a failure is ours, we will work to restore access
          and recover any photographs already received.
        </p>
      </Section>

      <Section title="Limitation of liability">
        <p>
          To the extent permitted by law, our liability arising out of or relating to these terms
          is limited to the amount you paid us for the event in question. We are not liable for
          indirect or consequential loss, including the loss of photographs a guest never uploaded.
        </p>
        <p className="mt-3 text-slate-500 text-sm">
          [LEGAL REVIEW NEEDED: South African consumer protection law (CPA) and POPIA place limits
          on exclusions of liability — this clause must be reviewed before it is relied on.]
        </p>
      </Section>

      <Section title="Changes to these terms">
        <p>
          We may update these terms as the product changes. Material changes will be noted on this
          page with a revised date above. Continuing to use the service after a change means you
          accept the updated terms.
        </p>
      </Section>

      <Section title="Contact">
        <p>Questions about these terms can be sent to:</p>
        <p className="mt-2 text-white">nsxincorporated@gmail.com</p>
      </Section>

      <p className="text-slate-500 text-xs mt-12 border-t border-slate-800 pt-6">
        These terms are a general template and have not been reviewed by a lawyer. Sections marked
        &ldquo;LEGAL REVIEW NEEDED&rdquo; should be confirmed with a South African legal advisor
        before this service is used at paying-client events. See also the{" "}
        <Link href="/privacy" className="underline hover:text-slate-400">
          Privacy Policy
        </Link>
        .
      </p>
    </main>
      <AppFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xl font-semibold text-slate-100 md:text-2xl">{title}</h2>
      {children}
    </section>
  );
}
