"use client";

import { useState } from "react";
import { EventLandingScreen, type LandingTeaser } from "./EventLandingScreen";
import { ShareConsentScreen } from "./ShareConsentScreen";
import { GuestUploadExperience } from "./GuestUploadExperience";

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

  const galleryHref = `/gallery/${eventCode}`;
  const liveCount = sharedCount === null ? null : sharedCount + addedThisSession;

  function handleAddPhotos() {
    setScreen(hasConsented ? "upload" : "consent");
  }

  if (screen === "consent") {
    return (
      <ShareConsentScreen
        onConfirm={() => {
          setHasConsented(true);
          setScreen("upload");
        }}
        onBack={() => setScreen("landing")}
      />
    );
  }

  if (screen === "upload") {
    return (
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
      />
    );
  }

  return (
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
  );
}
