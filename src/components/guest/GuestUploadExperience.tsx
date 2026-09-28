"use client";

import { Camera, ImagePlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useGuestUploader } from "./useGuestUploader";
import { validateFile, validateBatchSize } from "@/lib/validation/fileValidation";
import { PhotoPreviewGrid } from "./PhotoPreviewGrid";
import { UploadSuccessScreen } from "./UploadSuccessScreen";

/** File-picker triggers the guest shell's bottom action bar can call. */
export interface GuestUploadActions {
  camera: () => void;
  picker: () => void;
}

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
  /** Lets the shell's fixed bottom bar open this screen's file inputs. */
  registerActions?: (actions: GuestUploadActions | null) => void;
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
  registerActions,
}: Props) {
  const [screen, setScreen] = useState<Screen>("start");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [result, setResult] = useState<{ successCount: number; failedCount: number } | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const { items, addFiles, removeItem, uploadAll, retryItem, reset } = useGuestUploader(eventCode);

  // Publish the hidden inputs' triggers to the shell's bottom action bar for
  // as long as this screen is mounted.
  useEffect(() => {
    registerActions?.({
      camera: () => cameraInputRef.current?.click(),
      picker: () => galleryInputRef.current?.click(),
    });
    return () => registerActions?.(null);
  }, [registerActions]);

  function handleFilesSelected(fileList: FileList | null, input: HTMLInputElement | null) {
    // FileList can be live: clearing the input first may also clear the
    // selected files before they are copied on mobile browsers.
    const files = fileList ? Array.from(fileList) : [];

    // Reset immediately so picking the SAME file again after a cancel still
    // fires onChange — otherwise the picker silently does nothing the second
    // time, which reads to a guest as "the button is broken".
    if (input) input.value = "";
    if (files.length === 0) return;
    setValidationError(null);
    setInfoMessage(null);

    // FROG #8: don't silently reject the 11th photo, and don't throw the
    // whole selection away either. Keep what fits and say so.
    const batchCheck = validateBatchSize(files.length, maxFilesPerUpload);
    const accepted = batchCheck.valid ? files : files.slice(0, maxFilesPerUpload);
    if (!batchCheck.valid) setInfoMessage(batchCheck.message ?? null);

    const invalid = accepted
      .map((f) => validateFile({ size: f.size, type: f.type, name: f.name }, maxFileSizeBytes))
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
    <div className="px-4 pb-8 pt-4">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/heif"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files, e.target)}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/heif"
        multiple
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files, e.target)}
      />

      <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-md flex-col">
        <button
          type="button"
          onClick={onBack}
          className="-ml-2 mb-8 flex w-fit items-center gap-1 rounded-full px-2 py-1 text-sm text-slate-400"
        >
          <span aria-hidden="true">←</span> Back
        </button>

        <div className="flex-1">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-500/30">
            <Camera className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-white md:text-4xl">
            Share your moments
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-400">
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
            className="tap-target flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98]"
          >
            <ImagePlus className="h-5 w-5" strokeWidth={2.2} />
            Choose photos
          </button>

          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="tap-target flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-700 bg-slate-800/80 px-6 py-4 text-lg font-semibold text-slate-200 transition-all hover:bg-slate-800 active:scale-[0.98]"
          >
            <Camera className="h-5 w-5" strokeWidth={2.2} />
            Take a moment
          </button>
        </div>

        <p className="mt-8 text-center text-xs text-slate-600">
          No account needed · JPG, PNG, HEIC or HEIF up to{" "}
          {Math.round(maxFileSizeBytes / (1024 * 1024))} MB
          <br />
          Large JPEGs are lightly optimized to save mobile data while keeping high quality.
        </p>
      </div>
    </div>
  );
}
