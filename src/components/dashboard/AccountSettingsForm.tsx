"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

const NAME_MAX = 120;
const PHONE_MAX = 32;

interface AccountSettingsFormProps {
  initialName: string;
  initialPhone: string;
}

/**
 * Profile editor for the signed-in host.
 *
 * The save itself belongs to Supabase, not to component state: the name lives
 * in `public.clients` and is read back by the header, the gallery and the
 * printable poster. POST /api/account calls `update_own_client_profile()`
 * (migration 0023), which writes the caller's own row — so this form can only
 * ever edit the signed-in user's own profile. `router.refresh()` then re-renders
 * the server components that read that row, which is what makes the new name
 * appear in the header without a full page reload.
 *
 * Mirrors the server's limits (120 char name, 32 char phone) so the common
 * mistakes are caught before a round trip; the RPC enforces them for real.
 */
export function AccountSettingsForm({ initialName, initialPhone }: AccountSettingsFormProps) {
  const toast = useToast();
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedName = name.trim();
  const trimmedPhone = phone.trim();
  const dirty = trimmedName !== initialName.trim() || trimmedPhone !== initialPhone.trim();

  async function handleSubmit(event: React.FormEvent | null) {
    event?.preventDefault();
    if (busy) return;

    if (!trimmedName) {
      setError("Enter the name you want guests to see on your events.");
      return;
    }

    if (trimmedName.length > NAME_MAX) {
      setError(`That name is too long — keep it under ${NAME_MAX} characters.`);
      return;
    }

    if (trimmedPhone.length > PHONE_MAX) {
      setError(`That phone number is too long — keep it under ${PHONE_MAX} characters.`);
      return;
    }

    setBusy(true);
    setError(null);

    const response = await fetch("/api/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Phone is always sent, including as "" when cleared: the RPC reads an
      // empty string as "remove my number" and null as "leave it alone".
      body: JSON.stringify({ name: trimmedName, phone: trimmedPhone }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const message = body.error ?? "We couldn't save your details. Please try again.";
      setBusy(false);
      setError(message);
      toast.show({ tone: "error", title: "Save failed", description: message });
      return;
    }

    const saved = (await response.json().catch(() => ({}))) as {
      name?: string | null;
      phone?: string | null;
    };

    // Render what the database actually stored, not what we hoped it stored.
    setName(saved.name ?? trimmedName);
    setPhone(saved.phone ?? "");

    // Re-render the server components that read the profile — the dashboard
    // header shows this name, and it re-reads the clients row on the server.
    router.refresh();
    setBusy(false);
    toast.show({
      tone: "success",
      title: "Account updated",
      description: "Your host profile has been saved.",
    });
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      {error && (
        <ErrorAlert title="Couldn't save changes" onRetry={() => void handleSubmit(null)}>
          {error}
        </ErrorAlert>
      )}

      <Input
        label="Your name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Thabo Mokoena"
        autoComplete="name"
        maxLength={NAME_MAX}
      />

      <Input
        label="Phone"
        type="tel"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        placeholder="+27 82 000 0000"
        autoComplete="tel"
        maxLength={PHONE_MAX}
        hint="Only used if we need to reach you about an event."
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={busy} disabled={busy || !dirty}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
        {dirty && !busy && (
          <span className="text-xs font-medium text-slate-500">Unsaved changes</span>
        )}
      </div>
    </form>
  );
}

export default AccountSettingsForm;
