"use client";

import { useCallback, useState } from "react";
import imageCompression from "browser-image-compression";

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
 * Guests get a stable anonymous identifier stored in localStorage — NOT
 * an account, NOT PII, just enough to let the UI say "your uploads" in
 * the current session. This is never used for access control (see
 * insert_guest_photo RPC, which trusts event_code + server-side
 * validation only, never this value).
 */
function getUploaderIdentifier(): string {
  const key = "eph_uploader_id";
  let id = typeof window !== "undefined" ? localStorage.getItem(key) : null;
  if (!id) {
    id = safeRandomId();
    if (typeof window !== "undefined") localStorage.setItem(key, id);
  }
  return id;
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
    async (item: UploadItem) => {
      try {
        updateItem(item.id, { status: "compressing", progress: 5 });

        // Client-side pre-compression BEFORE upload: mobile cameras easily
        // produce 8-12MB originals (spec section 5). Shrinking to a
        // reasonable ceiling here saves guest mobile data and cuts upload
        // time dramatically on venue wifi shared by 100+ phones — the
        // server-side pipeline still produces gallery/thumb variants from
        // whatever lands, so this is an optimization, not the source of
        // truth for image quality.
        let uploadFile: File = item.file;
        if (item.file.size > 3 * 1024 * 1024 && item.file.type !== "image/heic") {
          uploadFile = await imageCompression(item.file, {
            maxSizeMB: 4,
            maxWidthOrHeight: 4000,
            useWebWorker: true,
          });
        }

        const dimensions = await getImageDimensions(item.file);

        updateItem(item.id, { status: "uploading", progress: 15 });

        // STEP 1: ask our server for a presigned URL scoped to this event.
        const requestRes = await fetch("/api/upload/request-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventCode,
            fileName: item.file.name,
            fileSize: uploadFile.size,
            mimeType: uploadFile.type || item.file.type,
            uploaderIdentifier: getUploaderIdentifier(),
          }),
        });

        if (!requestRes.ok) {
          const body = await requestRes.json().catch(() => ({}));
          throw new Error(body.error ?? "Upload interrupted. Please try again.");
        }

        const { uploadUrl, storagePath } = await requestRes.json();

        updateItem(item.id, { progress: 30 });

        // STEP 2: PUT the actual bytes directly to R2 using the presigned URL.
        await putWithProgress(uploadUrl, uploadFile, (pct) => {
          updateItem(item.id, { progress: 30 + Math.round(pct * 0.6) }); // 30-90%
        });

        updateItem(item.id, { progress: 92 });

        // STEP 3: confirm — creates the DB row via insert_guest_photo().
        const confirmRes = await fetch("/api/upload/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventCode,
            storagePath,
            originalFilename: item.file.name,
            fileSize: uploadFile.size,
            mimeType: uploadFile.type || item.file.type,
            uploaderIdentifier: getUploaderIdentifier(),
            width: dimensions?.width,
            height: dimensions?.height,
          }),
        });

        if (!confirmRes.ok) {
          const body = await confirmRes.json().catch(() => ({}));
          throw new Error(body.error ?? "Upload interrupted. Please try again.");
        }

        updateItem(item.id, { status: "success", progress: 100 });
      } catch (err) {
        updateItem(item.id, {
          status: "error",
          errorMessage: err instanceof Error ? err.message : "Upload interrupted. Please try again.",
        });
      }
    },
    [eventCode, updateItem]
  );

  const uploadAll = useCallback(
    async (targetItems?: UploadItem[]) => {
      const toUpload = targetItems ?? items.filter((it) => it.status === "queued" || it.status === "error");
      // Concurrency cap: don't fire 10 simultaneous PUTs from one phone on
      // possibly-poor venue wifi — that starves each request of bandwidth
      // and makes progress bars look stuck. 3-at-a-time keeps the phone
      // responsive and completes faster in practice on congested networks.
      const CONCURRENCY = 3;
      const queue = [...toUpload];
      const workers = Array.from({ length: CONCURRENCY }, async () => {
        while (queue.length > 0) {
          const next = queue.shift();
          if (next) await uploadOne(next);
        }
      });
      await Promise.all(workers);
    },
    [items, uploadOne]
  );

  const retryItem = useCallback(
    (id: string) => {
      const item = items.find((it) => it.id === id);
      if (item) uploadOne({ ...item, status: "queued", progress: 0 });
    },
    [items, uploadOne]
  );

  const reset = useCallback(() => {
    items.forEach((it) => URL.revokeObjectURL(it.previewUrl));
    setItems([]);
  }, [items]);

  return { items, addFiles, removeItem, uploadAll, retryItem, reset };
}

function putWithProgress(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
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
