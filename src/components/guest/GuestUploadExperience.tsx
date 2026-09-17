"use client";

import { useRef, useState } from "react";
import { useGuestUploader } from "./useGuestUploader";
import { validateFile, validateBatchSize } from "@/lib/validation/fileValidation";
import { PhotoPreviewGrid } from "./PhotoPreviewGrid";
import { UploadSuccessScreen } from "./UploadSuccessScreen";

interface Props {
  eventCode: string;
  eventName: string;
  maxFileSizeBytes: number;
  maxFilesPerUpload: number;
  galleryHref: string;
  galleryAvailable: boolean;
  /** Photos in the gallery including everything this device just added. */
  galleryCount: number | null;
  onBack: () => void;
  onUploaded: (successCount: number) => void;
}

type Screen = "start" | "preview" | "success";

export function GuestUploadExperience({
  eventCode,
  eventName,
  maxFileSizeBytes,
  maxFilesPerUpload,
  galleryHref,
  galleryAvailable,
  galleryCount,
  onBack,
  onUploaded,
}: Props) {
  const [screen, setScreen] = useState<Screen>("start");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [result, setResult] = useState<{ successCount: number; failedCount: number } | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const { items, addFiles, removeItem, uploadAll, retryItem, reset } = useGuestUploader(eventCode);

  function handleFilesSelected(fileList: FileList | null, input: HTMLInputElement | null) {
    // Reset immediately so picking the SAME file again after a cancel still
    // fires onChange — otherwise the picker silently does nothing the second
    // time, which reads to a guest as "the button is broken".
    if (input) input.value = "";
    if (!fileList || fileList.length === 0) return;
    setValidationError(null);
    setInfoMessage(null);

    const files = Array.from(fileList);

    // FROG #8: don't silently reject the 11th photo, and don't throw the
    // whole selection away either. Keep what fits and say so.
    const batchCheck = validateBatchSize(files.length, maxFilesPerUpload);
    const accepted = batchCheck.valid ? files : files.slice(0, maxFilesPerUpload);
    if (!batchCheck.valid) setInfoMessage(batchCheck.message ?? null);

    const invalid = accepted
      .map((f) => validateFile({ size: f.size, type: f.type }, maxFileSizeBytes))
      .find((r) => !r.valid);
    if (invalid) {
      setValidationError(invalid.message!);
      return;
    }

    addFiles(accepted);
    setScreen("preview");
  }

  async function handleUploadClick() {
    const uploadResult = await uploadAll();
    setResult(uploadResult);
    if (uploadResult.successCount > 0) {
      onUploaded(uploadResult.successCount);
      setScreen("success");
    }
    // All failed → stay on the preview grid, where every failed tile is
    // tappable to retry. Sending a guest to a dead-end "interrupted" screen
    // here would discard photos they can still recover.
  }

  async function handleRetryFailed() {
    const failed = items.filter((i) => i.status === "error");
    const uploadResult = await uploadAll(failed);
    setResult((prev) => ({
      successCount: (prev?.successCount ?? 0) + uploadResult.successCount,
      failedCount: uploadResult.failedCount,
    }));
    if (uploadResult.successCount > 0) onUploaded(uploadResult.successCount);
    if (uploadResult.successCount > 0) setScreen("success");
  }

  async function handleRetryOne(id: string) {
    const succeeded = await retryItem(id);
    if (!succeeded) return;
    onUploaded(1);
    setResult((prev) => ({
      successCount: (prev?.successCount ?? 0) + 1,
      failedCount: Math.max(0, (prev?.failedCount ?? 1) - 1),
    }));
  }

  function handleSuccessContinue() {
    const successCount = items.filter((i) => i.status === "success").length;
    const failedCount = items.filter((i) => i.status === "error").length;
    setResult({ successCount, failedCount });
    setScreen("success");
  }

  function handleAddMore() {
    reset();
    setResult(null);
    setValidationError(null);
    setInfoMessage(null);
    setScreen("start");
  }

  if (screen === "success" && result) {
    return (
      <UploadSuccessScreen
        eventName={eventName}
        successCount={result.successCount}
        failedCount={result.failedCount}
        galleryHref={galleryHref}
        galleryAvailable={galleryAvailable}
        galleryCount={galleryCount}
        onAddMore={handleAddMore}
        onRetryFailed={handleRetryFailed}
      />
    );
  }

  if (screen === "preview") {
    return (
      <PhotoPreviewGrid
        items={items}
        maxFilesPerUpload={maxFilesPerUpload}
        infoMessage={infoMessage}
        onRemove={removeItem}
        onRetry={handleRetryOne}
        onRetryFailed={handleRetryFailed}
        onUpload={handleUploadClick}
        onContinue={handleSuccessContinue}
        onCancel={handleAddMore}
      />
    );
  }

  // FROG #3 — the whole ask is one line and one button. No name, no email,
  // no phone number, no account.
  return (
    <main className="min-h-screen px-6 pb-8 pt-6">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files, e.target)}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files, e.target)}
      />

      <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-md flex-col">
        <button
          type="button"
          onClick={onBack}
          className="-ml-2 mb-8 flex w-fit items-center gap-1 rounded-full px-2 py-1 text-sm text-white/60"
        >
          <span aria-hidden="true">←</span> Back
        </button>

        <div className="flex-1">
          <span aria-hidden="true" className="text-4xl">
            📸
          </span>
          <h1 className="mt-5 font-display text-4xl leading-tight">Share your moments</h1>
          <p className="mt-3 text-base leading-relaxed text-white/60">
            Add up to {maxFilesPerUpload} photos from your phone to {eventName}.
          </p>

          {validationError && (
            <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {validationError}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="tap-target flex w-full items-center justify-center gap-3 rounded-2xl bg-accent px-6 py-4 text-lg font-semibold text-ink-950 shadow-lg shadow-accent/20 transition-transform active:scale-[0.98]"
          >
            <span aria-hidden="true" className="text-2xl">
              🖼️
            </span>
            Choose photos
          </button>

          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="tap-target flex w-full items-center justify-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-6 py-4 text-lg font-semibold text-white transition-transform active:scale-[0.98]"
          >
            <span aria-hidden="true" className="text-2xl">
              📷
            </span>
            Take a photo
          </button>
        </div>

        <p className="mt-8 text-center text-xs text-white/30">
          No account needed · JPG, PNG, WebP or HEIC up to{" "}
          {Math.round(maxFileSizeBytes / (1024 * 1024))} MB
        </p>
      </div>
    </main>
  );
}
