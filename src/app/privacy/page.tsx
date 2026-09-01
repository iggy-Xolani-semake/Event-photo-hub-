import Link from "next/link";

export const metadata = { title: "Privacy Policy — Event Photo Hub" };

// Content lives in a plain component (not fetched from a CMS) so it's
// easy for a lawyer or the site owner to edit directly — see the
// LEGAL REVIEW note in docs/LEGAL_REVIEW_NEEDED.md for what still needs
// sign-off before this is relied on for a live paying client base.
export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen px-6 py-12 max-w-2xl mx-auto text-white/80 leading-relaxed">
      <Link href="/" className="text-sm text-white/50 hover:text-white/80">
        ← Back
      </Link>

      <h1 className="font-display text-3xl text-white mt-4 mb-2">Privacy Policy</h1>
      <p className="text-white/40 text-sm mb-10">Last updated: [DATE — fill in before publishing]</p>

      <Section title="Who this policy covers">
        <p>
          This service is operated by <strong>NSX Inc</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;) on
          behalf of event hosts (&ldquo;clients&rdquo;) who use it to collect photographs from their
          guests. If you&apos;re a guest scanning a QR code to upload a photo, or a client viewing
          your event gallery, this policy explains what happens with your information.
        </p>
        <p className="mt-3 text-white/50 text-sm">
          [LEGAL REVIEW NEEDED: depending on the exact arrangement with each client, NSX Inc may
          be acting as a POPIA &ldquo;responsible party&rdquo;, an &ldquo;operator&rdquo;, or both
          depending on the event — this should be confirmed with a legal advisor and this section
          updated accordingly before relying on it for real events.]
        </p>
      </Section>

      <Section title="What we collect">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Photographs you choose to upload or that a client&apos;s guests upload to an event.</li>
          <li>Basic technical metadata attached to a photo: file size, image dimensions, and upload timestamp.</li>
          <li>
            An anonymous device identifier stored in your browser (not your name, not an account) —
            used only to show you which photos you personally uploaded during a session.
          </li>
          <li>For clients: name, email, and phone number provided when an event is created.</li>
        </ul>
        <p className="mt-3">
          Guests are never required to create an account, provide their name, or log in to
          upload a photo.
        </p>
      </Section>

      <Section title="Photos of other people">
        <p>
          Because this service is designed for group events, photos uploaded by one guest often
          include other people — other guests, hosts, or bystanders — who have not individually
          consented to having their photo uploaded here. By uploading a photo, you confirm you
          have a reasonable basis to share it in the context of the event (e.g. you attended and
          took it, or were given the photo by someone who did).
        </p>
        <p className="mt-3">
          If you appear in a photo on this platform and want it removed, contact the event host
          directly, or reach us at the contact details below and we&apos;ll assist in escalating
          the request.
        </p>
      </Section>

      <Section title="Where your data is stored">
        <p>
          Photographs are stored using Cloudflare R2 cloud storage. Event and account records are
          stored using Supabase, a managed database provider. Depending on configuration, data may
          be stored on servers outside South Africa.
        </p>
        <p className="mt-3 text-white/50 text-sm">
          [LEGAL REVIEW NEEDED: confirm the actual Supabase/R2 region(s) in use and whether
          POPIA&apos;s cross-border transfer conditions (Section 72) are satisfied — e.g. via the
          provider&apos;s own compliance commitments — and reference that specifically here.]
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          Photos and event data are retained for as long as the event remains active, and for a
          reasonable period afterward so clients can access their gallery. An event host may
          request deletion of their event and its photographs at any time by contacting us.
        </p>
      </Section>

      <Section title="Your rights">
        <p>You may have the right to:</p>
        <ul className="list-disc pl-5 space-y-1.5 mt-2">
          <li>Ask what personal information we hold about you</li>
          <li>Request correction of inaccurate information</li>
          <li>Request deletion of a photograph or your information, subject to the event host&apos;s own records</li>
          <li>Object to certain processing of your information</li>
        </ul>
        <p className="mt-3">
          To exercise any of these rights, contact us using the details below, or your event
          host directly if your request concerns a specific event.
        </p>
      </Section>

      <Section title="Security">
        <p>
          Photo uploads use short-lived, single-use upload links rather than shared passwords or
          permanent credentials. Event galleries can be configured as private, shared, or public
          by the event host, and private galleries require the host to be signed in to view them.
          No system is perfectly secure, and we encourage hosts to choose the visibility setting
          appropriate for their event.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about this policy or a request regarding your information can be sent to:
        </p>
        <p className="mt-2 text-white">[NSX Inc contact email — fill in before publishing]</p>
      </Section>

      <p className="text-white/40 text-xs mt-12 border-t border-white/10 pt-6">
        This policy is a general template and has not been reviewed by a lawyer. Sections marked
        &ldquo;LEGAL REVIEW NEEDED&rdquo; should be confirmed with a South African legal or POPIA
        compliance advisor before this service is used to collect real guest photographs at
        paying-client events.
      </p>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-medium text-white mb-3">{title}</h2>
      {children}
    </section>
  );
}
