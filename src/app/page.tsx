import Link from "next/link";
import {
  CreateEventIcon,
  ShareQrIcon,
  UploadPhotoIcon,
  ViewMemoriesIcon,
} from "@/components/marketing/StepIcons";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-ink-950 text-white">
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-16 text-center animate-fade-in">
        <p className="text-accent text-sm tracking-wide mb-4">Event Photo Hub</p>

        <h1 className="font-display text-4xl sm:text-5xl leading-tight mb-6">
          Every photo your guests take, in one place, without an app.
        </h1>

        <p className="text-white/70 text-lg leading-relaxed max-w-xl mx-auto">
          You put up a QR code at your event. Anyone can scan it and add their photos in a
          few seconds — no download, no account, no password. Every photo lands in one shared
          gallery you can open, sort, and download afterward.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-9">
          <Link
            href="/admin/login"
            className="bg-accent text-ink-950 font-semibold rounded-xl px-6 py-3.5 inline-flex items-center justify-center"
          >
            Sign in
          </Link>
          <Link
            href="/privacy"
            className="border border-white/15 text-white/80 font-semibold rounded-xl px-6 py-3.5 inline-flex items-center justify-center hover:border-white/30"
          >
            Privacy &amp; trust
          </Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <Step
            icon={<CreateEventIcon />}
            title="Create an event"
            detail="Give it a name and a date. The event gets its own private space — nothing from other events ever mixes in."
          />
          <Step
            icon={<ShareQrIcon />}
            title="Share the QR code"
            detail="Print it, put it on a table, or send the link directly. Anyone who scans it lands straight on the upload screen."
          />
          <Step
            icon={<UploadPhotoIcon />}
            title="Guests upload"
            detail="A guest takes a photo or picks one from their phone. No signup, no app — it's added to the gallery in seconds."
          />
          <Step
            icon={<ViewMemoriesIcon />}
            title="Everyone views the memories"
            detail="Open the gallery anytime to see every photo guests shared, mark favourites, and download the ones you love."
          />
        </div>
      </section>
    </main>
  );
}

function Step({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div>
      <div className="text-accent mb-4">{icon}</div>
      <h2 className="font-medium text-lg mb-2">{title}</h2>
      <p className="text-white/55 text-sm leading-relaxed">{detail}</p>
    </div>
  );
}
