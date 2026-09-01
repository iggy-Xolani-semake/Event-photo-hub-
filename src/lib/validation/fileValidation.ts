import { ALLOWED_MIME_TYPES } from "@/lib/storage/paths";

export interface FileValidationResult {
  valid: boolean;
  errorCode?: "FILE_TOO_LARGE" | "UNSUPPORTED_FILE_TYPE" | "EMPTY_FILE";
  message?: string;
}

/**
 * Runs on the client BEFORE upload (fast feedback, spec section 35) AND
 * again on the server before a presigned URL is issued (never trust the
 * client-reported mime type / size alone — spec section 39). Keep the
 * two call sites using this same function so the rules can't drift.
 */
export function validateFile(file: {
  size: number;
  type: string;
}, maxSizeBytes: number): FileValidationResult {
  if (file.size <= 0) {
    return { valid: false, errorCode: "EMPTY_FILE", message: "This file appears to be empty." };
  }

  if (file.size > maxSizeBytes) {
    const mb = (maxSizeBytes / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      errorCode: "FILE_TOO_LARGE",
      message: `This photo is larger than the ${mb} MB limit.`,
    };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      errorCode: "UNSUPPORTED_FILE_TYPE",
      message: "This file type isn't supported. Please use JPG, PNG, WebP, or HEIC.",
    };
  }

  return { valid: true };
}

export function validateBatchSize(fileCount: number, maxFiles: number): FileValidationResult {
  if (fileCount > maxFiles) {
    return {
      valid: false,
      message: `You can upload up to ${maxFiles} photos at a time. Please select fewer photos.`,
    };
  }
  return { valid: true };
}

/** Maps backend error codes (from the guest-upload RPC) to guest-facing copy. Never show raw DB errors. */
export function errorCodeToMessage(code: string): string {
  switch (code) {
    case "EVENT_NOT_FOUND":
      return "We couldn't find this event. Please check the link or QR code.";
    case "EVENT_NOT_ACCEPTING_UPLOADS":
      return "This event is no longer accepting photographs.";
    case "EVENT_UPLOAD_LIMIT_REACHED":
      return "This event has reached its photo limit.";
    case "FILE_TOO_LARGE":
      return "This photo is too large to upload.";
    case "UNSUPPORTED_FILE_TYPE":
      return "This file type isn't supported.";
    case "INVALID_STORAGE_PATH":
    default:
      return "Something went wrong with the upload. Please try again.";
  }
}
