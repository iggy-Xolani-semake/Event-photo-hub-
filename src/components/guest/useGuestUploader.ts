"use client";

import { useCallback, useState } from "react";
import imageCompression from "browser-image-compression";
import { mimeTypeFromFilename } from "@/lib/storage/paths";

export type UploadItemStatus = "queued" | "compressing" | "uploading" | "success" | "error";

export interface UploadItem {
  id: string;
  file: File;
  previewUrl: string;
  status: UploadItemStatus;
  progress: number; // 0-100
  errorMessage?: string;
}

/**
 * crypto.randomUUID() only exists in "secure contexts" (HTTPS, or the
 * literal hostname localhost) per the browser spec. Guests testing over
 * a plain-HTTP LAN IP (e.g. http://192.168.x.x:3000, which is how you'd
 * reach a dev server from a real phone before HTTPS is set up) get
 * `undefined` for the entire crypto.randomUUID function, not an error —
 * calling it then throws "crypto.randomUUID is not a function". This
 * doesn't affect anything security-critical (these IDs are never used
 * for access control — see the comment on getUploaderIdentifier below),
 * so a plain Math.random-based fallback is fine here; it only needs to
 * be unique enough to tell one local upload item from another in the UI.
 */
function safeRandomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * The guest's session token is issued by the server and stored in an
 * event-scoped HttpOnly cookie. JavaScript never reads or submits it.
 *
 * This replaces the old `eph_uploader_id`: that was a browser-made string the
 * server stored but never counted. The counter now lives in
 * guest_sessions and is incremented inside the same transaction that inserts
 * the photo, under a row lock.
 *
 * The promise is memoised per event so a batch of ten photos asks once.
 */
const guestSessionPromises = new Map<string, Promise<void>>();

async function startGuestSession(eventCode: string): Promise<void> {
  const res = await fetch("/api/guest/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventCode }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "We couldn't start your upload session. Please try again.");
  }

  await res.json();
}

function ensureGuestSession(eventCode: string): Promise<void> {
  let pending = guestSessionPromises.get(eventCode);
  if (!pending) {
    pending = startGuestSession(eventCode).catch((err) => {
      guestSessionPromises.delete(eventCode); // a retry must be allowed to try again
      throw err;
    });
    guestSessionPromises.set(eventCode, pending);
  }
  return pending;
}

async function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(file);
  });
}

export function useGuestUploader(eventCode: string) {
  const [items, setItems] = useState<UploadItem[]>([]);

  const updateItem = useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const addFiles = useCallback((files: File[]) => {
    const newItems: UploadItem[] = files.map((file) => ({
      id: safeRandomId(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: "queued",
      progress: 0,
    }));
    setItems((prev) => [...prev, ...newItems]);
    return newItems;
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const uploadOne = useCallback(
    async (item: UploadItem): Promise<boolean> => {
      try {
        updateItem(item.id, { status: "compressing", progress: 5 });

        // Apply only a light JPEG optimization. HEIC/HEIF and PNG are left
        // byte-for-byte untouched because browser decoding/re-encoding can
        // damage them or remove useful metadata. Resolution is preserved;
        // the optimizer targets roughly 10% savings and falls back to the
        // original if a device cannot decode the image.
        const uploadFile = await lightlyOptimizeJpeg(item.file);
        const effectiveMimeType = item.file.type || mimeTypeFromFilename(item.file.name) || "";
        const dimensions = await getImageDimensions(item.file);

        updateItem(item.id, { status: "uploading", progress: 15 });

        // The server-issued session token is what the per-guest quota is
        // counted against, so it is resolved before any bytes move.
        await ensureGuestSession(eventCode);

        // STEP 1: ask our server for a presigned URL scoped to this event.
        const requestRes = await fetch("/api/upload/request-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventCode,
            fileName: item.file.name,
            fileSize: uploadFile.size,
            mimeType: effectiveMimeType,
          }),
        });

        if (!requestRes.ok) {
          const body = await requestRes.json().catch(() => ({}));
          throw new Error(body.error ?? "Upload interrupted. Please try again.");
        }

        const { uploadUrl, storagePath, photoId } = await requestRes.json();

        updateItem(item.id, { progress: 30 });

        // STEP 2: PUT the actual bytes directly to R2 using the presigned URL.
        let lastUploadError: unknown;
        for (let attempt = 1; attempt <= 3; attempt += 1) {
          try {
            await putWithProgress(uploadUrl, uploadFile, effectiveMimeType, (pct) => {
              updateItem(item.id, { progress: 30 + Math.round(pct * 0.6) }); // 30-90%
            });
            lastUploadError = undefined;
            break;
          } catch (err) {
            lastUploadError = err;
            if (attempt < 3) {
              await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
            }
          }
        }
        if (lastUploadError) throw lastUploadError;

        updateItem(item.id, { progress: 92 });

        // STEP 3: confirm — creates the DB row via insert_guest_photo().
        const confirmRes = await fetch("/api/upload/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventCode,
            photoId,
            storagePath,
            originalFilename: item.file.name,
            fileSize: uploadFile.size,
            mimeType: effectiveMimeType,
            width: dimensions?.width,
            height: dimensions?.height,
          }),
        });

        if (!confirmRes.ok) {
          const body = await confirmRes.json().catch(() => ({}));
          throw new Error(body.error ?? "Upload interrupted. Please try again.");
        }

        updateItem(item.id, { status: "success", progress: 100 });
        return true;
      } catch (err) {
        updateItem(item.id, {
          status: "error",
          errorMessage: err instanceof Error ? err.message : "Upload interrupted. Please try again.",
        });
        return false;
      }
    },
    [eventCode, updateItem]
  );

  const uploadAll = useCallback(
    async (
      targetItems?: UploadItem[]
    ): Promise<{ successCount: number; failedCount: number }> => {
      const toUpload = targetItems ?? items.filter((it) => it.status === "queued" || it.status === "error");
      // Concurrency cap: two uploads at a time keeps the phone responsive on
      // weak venue Wi-Fi and avoids competing for the same mobile uplink.
      const CONCURRENCY = 2;
      const queue = [...toUpload];
      let successCount = 0;
      let failedCount = 0;
      const workers = Array.from({ length: CONCURRENCY }, async () => {
        while (queue.length > 0) {
          const next = queue.shift();
          if (next) {
            // Safe to increment from concurrent workers: JS is single-threaded,
            // so these only interleave at await points, never mid-increment.
            if (await uploadOne(next)) successCount += 1;
            else failedCount += 1;
          }
        }
      });
      await Promise.all(workers);
      return { successCount, failedCount };
    },
    [items, uploadOne]
  );

  const retryItem = useCallback(
    async (id: string): Promise<boolean> => {
      const item = items.find((it) => it.id === id);
      if (!item) return false;
      return uploadOne({ ...item, status: "queued", progress: 0 });
    },
    [items, uploadOne]
  );

  const reset = useCallback(() => {
    items.forEach((it) => URL.revokeObjectURL(it.previewUrl));
    setItems([]);
  }, [items]);

  return { items, addFiles, removeItem, uploadAll, retryItem, reset };
}

async function lightlyOptimizeJpeg(file: File): Promise<File> {
  const mimeType = file.type || mimeTypeFromFilename(file.name) || "";
  if (mimeType !== "image/jpeg" || file.size < 6 * 1024 * 1024) return file;

  try {
    const targetMb = Math.max(1, (file.size / (1024 * 1024)) * 0.9);
    const optimized = await imageCompression(file, {
      maxSizeMB: targetMb,
      initialQuality: 0.92,
      alwaysKeepResolution: true,
      useWebWorker: true,
      fileType: "image/jpeg",
    });
    return optimized.size < file.size ? new File([optimized], file.name, { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

function putWithProgress(
  url: string,
  file: File,
  contentType: string,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress((e.loaded / e.total) * 100);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error("Upload interrupted. Please try again."));
    };
    xhr.onerror = () => reject(new Error("Upload interrupted. Please check your connection."));
    xhr.send(file);
  });
}
