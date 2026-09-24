"use client";

import { BlobWriter, HttpReader, ZipWriter, ZipWriterStream } from "@zip.js/zip.js";
import type { DownloadManifestPart } from "@/lib/download/types";

interface FileSystemWritable {
  write(data: Uint8Array): Promise<void>;
  close(): Promise<void>;
  abort(reason?: unknown): Promise<void>;
}

interface FileSystemHandle {
  createWritable(): Promise<FileSystemWritable>;
}

interface SaveFilePickerWindow extends Window {
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: Array<{ description: string; accept: Record<string, string[]> }>;
  }) => Promise<FileSystemHandle>;
}

export interface ZipProgress {
  completedFiles: number;
  totalFiles: number;
  part: number;
  totalParts: number;
  usingStreamingWriter: boolean;
}

/**
 * Builds one bounded ZIP64 part. ZIP entries use STORE mode because photos are
 * already compressed; zip.js still emits ZIP64 metadata when requested or
 * required. A 150 MB cap keeps the fallback safe on iOS Safari.
 */
export async function downloadZipPart(
  part: DownloadManifestPart,
  filename: string,
  onProgress?: (progress: ZipProgress) => void
): Promise<void> {
  const picker = (window as SaveFilePickerWindow).showSaveFilePicker;
  if (window.isSecureContext && typeof picker === "function") {
    await streamToFileSystem(part, filename, picker, onProgress);
    return;
  }

  await buildBoundedBlobFallback(part, filename, onProgress);
}

async function streamToFileSystem(
  part: DownloadManifestPart,
  filename: string,
  picker: NonNullable<SaveFilePickerWindow["showSaveFilePicker"]>,
  onProgress?: (progress: ZipProgress) => void
): Promise<void> {
  const handle = await picker({
    suggestedName: filename,
    types: [{ description: "ZIP archive", accept: { "application/zip": [".zip"] } }],
  });
  const writable = await handle.createWritable();
  const sink = new WritableStream<Uint8Array>({
    write: (chunk) => writable.write(chunk),
    close: () => writable.close(),
    abort: (reason) => writable.abort(reason),
  });
  const zipper = new ZipWriterStream({ zip64: true, level: 0 });
  const output = zipper.readable.pipeTo(sink);

  try {
    await pipeFilesIntoStream(part, zipper, onProgress, true);
    await zipper.close();
    await output;
  } catch (error) {
    await writable.abort(error).catch(() => undefined);
    throw error;
  }
}

async function pipeFilesIntoStream(
  part: DownloadManifestPart,
  zipper: ZipWriterStream,
  onProgress: ((progress: ZipProgress) => void) | undefined,
  usingStreamingWriter: boolean
): Promise<void> {
  for (let index = 0; index < part.files.length; index += 1) {
    const file = part.files[index];
    if (!file) continue;
    const response = await fetch(file.url);
    if (!response.ok || !response.body) {
      throw new Error(`Could not download ${file.name}`);
    }
    await response.body.pipeTo(zipper.writable(file.name));
    onProgress?.({
      completedFiles: index + 1,
      totalFiles: part.files.length,
      part: part.part,
      totalParts: part.totalParts,
      usingStreamingWriter,
    });
  }
}

/**
 * Older iOS Safari and Firefox do not expose showSaveFilePicker. This path
 * still streams each source into zip.js one at a time, but holds only the
 * current <=150 MB archive in a Blob before triggering the download.
 */
async function buildBoundedBlobFallback(
  part: DownloadManifestPart,
  filename: string,
  onProgress?: (progress: ZipProgress) => void
): Promise<void> {
  const blobWriter = new BlobWriter("application/zip");
  const zipper = new ZipWriter(blobWriter, { zip64: true, level: 0 });

  for (let index = 0; index < part.files.length; index += 1) {
    const file = part.files[index];
    if (!file) continue;
    await zipper.add(file.name, new HttpReader(file.url), { level: 0 });
    onProgress?.({
      completedFiles: index + 1,
      totalFiles: part.files.length,
      part: part.part,
      totalParts: part.totalParts,
      usingStreamingWriter: false,
    });
  }

  await zipper.close();
  const blob = await blobWriter.getData();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
