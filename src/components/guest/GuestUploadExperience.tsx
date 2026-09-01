"use client";

import { useRef, useState } from "react";
import { useGuestUploader } from "./useGuestUploader";
import { validateFile, validateBatchSize } from "@/lib/validation/fileValidation";
import { PhotoPreviewGrid } from "./PhotoPreviewGrid";
import { UploadSuccessScreen } from "./UploadSuccessScreen";

interface Props {
  eventCode: string;
  eventName: string;
  eventDate: string | null;
  maxFileSizeBytes: number;
  maxFilesPerUpload: number;
  brandCompanyName: string | null;
  brandPrimaryColor: string | null;
}

type Screen = "start" | "preview" | "success";

export function GuestUploadExperience({
  eventCode,
  eventName,
  eventDate,
  maxFileSizeBytes,
  maxFilesPerUpload,
}: Props) {
  const [screen, setScreen] = useState<Screen>("start");
  const [validationError, setValidationError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const { items, addFiles, removeItem, uploadAll, retryItem, reset } = useGuestUploader(eventCode);

  const formattedDate = eventDate
    ? new Date(eventDate + "T00:00:00").toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setValidationError(null);

    const files = Array.from(fileList);
    const batchCheck = validateBatchSize(files.length, maxFilesPerUpload);
    if (!batchCheck.valid) {
      setValidationError(batchCheck.message!);
      return;
    }

    const invalid = files
      .map((f) => validateFile({ size: f.size, type: f.type }, maxFileSizeBytes))
      .find((r) => !r.valid);
    if (invalid) {
      setValidationError(invalid.message!);
      return;
    }

    addFiles(files);
    setScreen("preview");
  }

  async function handleUploadClick() {
    await uploadAll();
    setScreen("success");
  }

  function handleUploadAnother() {
    reset();
    setValidationError(null);
    setScreen("start");
  }

  if (screen === "success") {
    const successCount = items.filter((i) => i.status === "success").length;
    const failedCount = items.filter((i) => i.status === "error").length;
    return (
      <UploadSuccessScreen
        successCount={successCount}
        failedCount={failedCount}
        onUploadAnother={handleUploadAnother}
      />
    );
  }

  if (screen === "preview") {
    return (
      <PhotoPreviewGrid
        items={items}
        onRemove={removeItem}
        onRetry={retryItem}
        onUpload={handleUploadClick}
        onCancel={handleUploadAnother}
      />
    );
  }

  return (
    <main className="min-h-screen flex flex-col px-6 py-10">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
      />

      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto w-full">
        <p className="uppercase tracking-[0.2em] text-accent text-sm font-medium mb-2">
          {eventName}
        </p>
        {formattedDate && <p className="text-white/50 text-sm mb-8">{formattedDate}</p>}

        <h1 className="font-display text-4xl mb-3 leading-tight">Share Your Moment</h1>
        <p className="text-white/60 mb-10 leading-relaxed">
          Take a photo or choose one from your phone and add it to the event gallery.
        </p>

        {validationError && (
          <div className="w-full bg-red-500/10 border border-red-500/30 text-red-200 text-sm rounded-xl px-4 py-3 mb-6">
            {validationError}
          </div>
        )}

        <div className="w-full flex flex-col gap-4">
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="tap-target w-full bg-accent text-ink-950 font-semibold text-lg rounded-2xl px-6 py-4 flex items-center justify-center gap-3 active:scale-[0.98] transition-transform shadow-lg shadow-accent/20"
          >
            <span className="text-2xl">📷</span> Take Photo
          </button>

          <button
            onClick={() => galleryInputRef.current?.click()}
            className="tap-target w-full bg-white/10 border border-white/20 text-white font-semibold text-lg rounded-2xl px-6 py-4 flex items-center justify-center gap-3 active:scale-[0.98] transition-transform"
          >
            <span className="text-2xl">🖼️</span> Choose from Gallery
          </button>
        </div>

        <p className="text-white/30 text-xs mt-10">
          Up to {maxFilesPerUpload} photos at a time · No account needed
        </p>
        <p className="text-white/25 text-xs mt-2">
          By uploading, you agree to our{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline">
            Privacy Policy
          </a>
        </p>
      </div>
    </main>
  );
}
