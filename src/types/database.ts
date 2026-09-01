// Hand-written to match supabase/migrations exactly. If you have the
// Supabase CLI, prefer regenerating this with:
//   supabase gen types typescript --project-id <ref> > src/types/database.ts
// and then re-merge the convenience aliases at the bottom of this file.

export type EventStatus = "active" | "closed" | "archived";
export type EventVisibility = "private" | "shared" | "public";
export type PhotoStatus = "processing" | "ready" | "failed" | "deleted";

export interface Client {
  id: string;
  auth_user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
}

export interface Event {
  id: string;
  event_code: string;
  event_name: string;
  event_date: string | null;
  client_id: string | null;
  status: EventStatus;
  visibility: EventVisibility;
  upload_limit: number;
  max_file_size_bytes: number;
  max_files_per_upload: number;
  photo_count: number;
  storage_used_bytes: number;
  brand_logo_url: string | null;
  brand_company_name: string | null;
  brand_primary_color: string | null;
  created_by: string | null;
  created_at: string;
  closed_at: string | null;
}

export interface Photo {
  id: string;
  event_id: string;
  original_filename: string | null;
  storage_path: string;
  gallery_path: string | null;
  thumbnail_path: string | null;
  file_size: number;
  mime_type: string;
  width: number | null;
  height: number | null;
  uploader_identifier: string | null;
  status: PhotoStatus;
  is_favourite: boolean;
  is_hidden: boolean;
  uploaded_at: string;
  processed_at: string | null;
}

/** Shape returned by the get_event_for_upload() RPC — public-safe subset of Event. */
export interface EventForUpload {
  event_id: string | null;
  event_name: string | null;
  event_date: string | null;
  status: EventStatus | null;
  can_upload: boolean;
  reason: "not_found" | "closed" | "archived" | "limit_reached" | null;
  max_file_size_bytes: number | null;
  max_files_per_upload: number | null;
  brand_logo_url: string | null;
  brand_company_name: string | null;
  brand_primary_color: string | null;
}

/** Error codes raised by insert_guest_photo() — map these to user-facing copy. */
export type GuestUploadErrorCode =
  | "EVENT_NOT_FOUND"
  | "EVENT_NOT_ACCEPTING_UPLOADS"
  | "EVENT_UPLOAD_LIMIT_REACHED"
  | "FILE_TOO_LARGE"
  | "UNSUPPORTED_FILE_TYPE"
  | "INVALID_STORAGE_PATH";
