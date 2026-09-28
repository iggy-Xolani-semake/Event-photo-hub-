"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

interface AccountSettingsFormProps {
  initialName: string;
  initialPhone: string;
}

/**
 * Profile editor. POST /api/account upserts the caller's own client row via
 * create_own_client_profile(), which derives identity from the session — so
 * this form can only ever edit the signed-in user's own profile.
 */
export function AccountSettingsForm({ initialName, initialPhone }: AccountSettingsFormProps) {
  const toast = useToast();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent | null) {
    event?.preventDefault();
    setBusy(true);
    setError(null);

    const response = await fetch("/api/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone }),
    });

    setBusy(false);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const message = body.error ?? "We couldn't save your details. Please try again.";
      setError(message);
      toast.show({ tone: "error", title: "Save failed", description: message });
      return;
    }

    toast.show({
      tone: "success",
      title: "Account updated",
      description: "Your host profile has been saved.",
    });
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      {error && <ErrorAlert title="Couldn't save changes" onRetry={() => void handleSubmit(null)}>{error}</ErrorAlert>}

      <Input
        label="Your name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Thabo Mokoena"
        autoComplete="name"
      />

      <Input
        label="Phone"
        type="tel"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        placeholder="+27 82 000 0000"
        autoComplete="tel"
        hint="Only used if we need to reach you about an event."
      />

      <Button type="submit" loading={busy}>
        {busy ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

export default AccountSettingsForm;
