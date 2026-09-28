"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EventLandingScreen, type LandingTeaser } from "./EventLandingScreen";
import { GuestActionBar, GuestShell } from "./GuestShell";
import { GuestUploadExperience, type GuestUploadActions } from "./GuestUploadExperience";
import { ShareConsentScreen } from "./ShareConsentScreen";

interface Props {
  eventCode: string;
  eventName: string;
  eventDate: string | null;
  /** Visible gallery count from the server, or null when the gallery is hidden. */
  sharedCount: number | null;
  galleryAvailable: boolean;
  maxFileSizeBytes: number;
  maxFilesPerUpload: number;
  brandCompanyName: string | null;
  teasers: LandingTeaser[];
  /** True when the guest arrived via the gallery's "+ Add my photos" button. */
  cameFromGallery?: boolean;
}

type Screen = "landing" | "consent" | "upload";

/**
 * Owns the guest's journey through ONE page load:
 *
 *   landing ──(Add my photos)──▶ consent ──(I understand)──▶ upload
 *      ▲                                                       │
 *      └────────────── (back / add more) ◀─────────────────────┘
 *
 * The whole loop lives on a single URL (/e/{code}) with no navigation, so
 * a guest who uploads three batches never reloads and never loses their
 * place. The gallery is the one real navigation away (/gallery/{code}),
 * because that is a different page with its own data.
 *
 * The fixed bottom action bar lives here, above the screens: its Take Photo /
 * Upload buttons reach into whichever upload screen is mounted through a
 * registered-actions callback, and if the guest is still on landing/consent
 * the intent is remembered and flushed the moment the picker screen mounts.
 */
export function GuestEventExperience({
  eventCode,
  eventName,
  eventDate,
  sharedCount,
  galleryAvailable,
  maxFileSizeBytes,
  maxFilesPerUpload,
  brandCompanyName,
  teasers,
  cameFromGallery = false,
}: Props) {
  // A guest arriving from the gallery already chose "add photos" on the
  // previous screen, so they skip the landing — but not the notice.
  const [screen, setScreen] = useState<Screen>(cameFromGallery ? "consent" : "landing");
  // Consent is remembered for the lifetime of this page load so a guest
  // adding a second batch isn't asked again, but a fresh scan sees it.
  const [hasConsented, setHasConsented] = useState(false);
  // Photos this device has added during this page load, so the landing
  // count and the success screen stay truthful without a refetch.
  const [addedThisSession, setAddedThisSession] = useState(0);
  // File-picker triggers registered by the mounted upload screen.
  const [uploadActions, setUploadActions] = useState<GuestUploadActions | null>(null);
  const pendingAction = useRef<"camera" | "picker" | null>(null);

  const galleryHref = `/gallery/${eventCode}`;
  const liveCount = sharedCount === null ? null : sharedCount + addedThisSession;

  const registerUploadActions = useCallback((actions: GuestUploadActions | null) => {
    setUploadActions(actions);
  }, []);

  function handleAddPhotos() {
    setScreen(hasConsented ? "upload" : "consent");
  }

  /** Bottom-bar entry point: act now, or remember the intent until we can. */
  function requestPicker(action: "camera" | "picker") {
    if (screen === "upload" && uploadActions) {
      uploadActions[action]();
      return;
    }
    pendingAction.current = action;
    setScreen(hasConsented ? "upload" : "consent");
  }

  // Flush a remembered intent as soon as the upload screen's inputs exist.
  useEffect(() => {
    if (!uploadActions || !pendingAction.current) return;
    const action = pendingAction.current;
    pendingAction.current = null;
    const timer = setTimeout(() => uploadActions[action](), 60);
    return () => clearTimeout(timer);
  }, [uploadActions, screen]);

  const actionBar = (
    <GuestActionBar
      onTakePhoto={() => requestPicker("camera")}
      onUpload={() => requestPicker("picker")}
      galleryHref={galleryHref}
      galleryAvailable={galleryAvailable}
    />
  );

  if (screen === "consent") {
    return (
      <GuestShell eventName={eventName} brandCompanyName={brandCompanyName} actionBar={actionBar}>
        <ShareConsentScreen
          onConfirm={() => {
            setHasConsented(true);
            setScreen("upload");
          }}
          onBack={() => setScreen("landing")}
        />
      </GuestShell>
    );
  }

  if (screen === "upload") {
    return (
      <GuestShell eventName={eventName} brandCompanyName={brandCompanyName} actionBar={actionBar}>
        <GuestUploadExperience
          eventCode={eventCode}
          eventName={eventName}
          maxFileSizeBytes={maxFileSizeBytes}
          maxFilesPerUpload={maxFilesPerUpload}
          galleryHref={galleryHref}
          galleryAvailable={galleryAvailable}
          galleryCount={liveCount}
          onBack={() => setScreen("landing")}
          onUploaded={(count) => setAddedThisSession((n) => n + count)}
          registerActions={registerUploadActions}
        />
      </GuestShell>
    );
  }

  return (
    <GuestShell eventName={eventName} brandCompanyName={brandCompanyName} actionBar={actionBar}>
      <EventLandingScreen
        eventName={eventName}
        eventDate={eventDate}
        sharedCount={liveCount}
        galleryAvailable={galleryAvailable}
        brandCompanyName={brandCompanyName}
        teasers={teasers}
        galleryHref={galleryHref}
        onAddPhotos={handleAddPhotos}
      />
    </GuestShell>
  );
}
