"use client";

import { useState } from "react";

export function CopyLinkButton({ url, label }: { url: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      onClick={handleCopy}
      className="text-center text-sm bg-white/10 border border-white/20 rounded-lg px-4 py-3"
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}
