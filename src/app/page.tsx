import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen p-8 flex flex-col items-center justify-center text-center">
      <h1 className="text-4xl font-bold mb-4">Event Photo Hub</h1>
      <p className="text-white/70 mb-8">
        Upload, manage, and share photos from your event.
      </p>
      <Link
        href="/admin/login"
        className="rounded-lg bg-accent px-5 py-3 font-semibold"
      >
        Admin login
      </Link>
    </main>
  );
}
