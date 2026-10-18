import { z } from "zod";
import { ALLOWED_MIME_TYPES } from "@/lib/storage/paths";

const eventCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{6,12}$/, "Invalid event code.");

const mimeType = z.string().refine((value) => ALLOWED_MIME_TYPES.includes(value), {
  message: "This file type isn't supported.",
});

export const guestUploadRequestSchema = z.object({
  eventCode,
  fileName: z.string().trim().min(1).max(1024, "File name is too long."),
  fileSize: z.number().int().positive(),
  mimeType: z.string().optional(),
  uploaderIdentifier: z.string().optional(),
});

export const guestUploadConfirmationSchema = z.object({
  eventCode,
  photoId: z.string().uuid(),
  storagePath: z.string().min(1).max(512),
  originalFilename: z.string().max(1024).nullable().optional(),
  fileSize: z.number().int().positive(),
  mimeType: mimeType.transform((value) => value.toLowerCase()),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
});

export const payFastCheckoutParamsSchema = z.object({ eventCode });

export const payFastItnSchema = z
  .object({
    signature: z.string().regex(/^[\da-f]{32}$/i),
    merchant_id: z.string().min(1),
    m_payment_id: z.string().uuid(),
    pf_payment_id: z.string().min(1),
    payment_status: z.string().min(1),
    amount_gross: z.string().optional(),
  })
  .passthrough();
