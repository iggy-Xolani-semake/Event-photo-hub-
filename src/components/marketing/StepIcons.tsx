// Small hand-drawn line icons for the homepage's 4-step sequence.
// Deliberately not from an icon library — four icons doesn't justify a
// new dependency, and hand-drawing them lets the stroke weight match
// this specific design rather than inherit a generic icon set's look.
// All share the same viewBox/stroke conventions so they sit consistently
// in a row together.

function IconShell({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-8 h-8"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function CreateEventIcon() {
  return (
    <IconShell>
      <rect x="7" y="9" width="26" height="24" rx="3" />
      <path d="M7 16h26" />
      <path d="M14 5v6M26 5v6" />
      <path d="M20 21v8M16 25h8" />
    </IconShell>
  );
}

export function ShareQrIcon() {
  return (
    <IconShell>
      <rect x="6" y="6" width="11" height="11" rx="1.5" />
      <rect x="23" y="6" width="11" height="11" rx="1.5" />
      <rect x="6" y="23" width="11" height="11" rx="1.5" />
      <path d="M25 25h4M25 30h9M31 25v9" />
    </IconShell>
  );
}

export function UploadPhotoIcon() {
  return (
    <IconShell>
      <path d="M8 27a4 4 0 0 1 0-8 7 7 0 0 1 13.5-2.4A6 6 0 0 1 32 21a5 5 0 0 1-1 9.9" />
      <path d="M20 18v13M16 22l4-4 4 4" />
    </IconShell>
  );
}

export function ViewMemoriesIcon() {
  return (
    <IconShell>
      <rect x="5" y="9" width="30" height="22" rx="3" />
      <circle cx="14" cy="17" r="2.5" />
      <path d="M5 27l8-7 6 5 5-4 11 9" />
    </IconShell>
  );
}
