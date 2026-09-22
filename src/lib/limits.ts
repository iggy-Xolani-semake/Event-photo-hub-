/**
 * The single source of truth for what a client is allowed to configure on
 * their own event.
 *
 * Two layers, on purpose:
 *   1. These caps — the product rules. Enforced in the API routes
 *      (/api/events, /api/events/[code]) with human-readable messages, and
 *      shown in the create/edit forms so a client sees the ceiling before
 *      they hit it.
 *   2. The absolute maxima in the `events_assert_limits` trigger
 *      (0005_client_self_service.sql), which are looser and exist only so
 *      that nothing — a future route, a dashboard edit, a script — can ever
 *      store an absurd value.
 *
 * If you change a number here, the form hints and the server rejection
 * messages follow automatically, because both read this object.
 */

export interface LimitRule {
  /** What the client sees next to the field. */
  label: string;
  min: number;
  max: number;
  /** Used when the caller omits the value (event creation). */
  fallback: number;
  /** Rendered after the number, e.g. "MB". */
  unit?: string;
}

export type LimitKey = "uploadLimit" | "maxFileSizeMb" | "maxFilesPerUpload";

export const EVENT_LIMIT_CAPS: Record<LimitKey, LimitRule> = {
  uploadLimit: {
    label: "Total photos the gallery can hold",
    min: 10,
    max: 500,
    fallback: 500,
  },
  maxFileSizeMb: {
    label: "Largest photo you'll accept",
    min: 1,
    max: 15,
    fallback: 15,
    unit: "MB",
  },
  maxFilesPerUpload: {
    label: "Photos a guest can add at once",
    min: 1,
    max: 10,
    fallback: 10,
  },
};

export interface EventLimitValues {
  uploadLimit: number;
  maxFileSizeMb: number;
  maxFilesPerUpload: number;
}

/** The values used when a client creates an event and leaves a field alone. */
export const DEFAULT_EVENT_LIMITS: EventLimitValues = {
  uploadLimit: EVENT_LIMIT_CAPS.uploadLimit.fallback,
  maxFileSizeMb: EVENT_LIMIT_CAPS.maxFileSizeMb.fallback,
  maxFilesPerUpload: EVENT_LIMIT_CAPS.maxFilesPerUpload.fallback,
};

interface NormalizationResult {
  values: EventLimitValues;
  errors: string[];
}

function toInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return Math.trunc(n);
}

/**
 * Validates the three configurable limits against EVENT_LIMIT_CAPS.
 *
 * `fallbacks` supplies the value for any field the caller omitted — the
 * product defaults on create, the event's current values on update, so a
 * partial PATCH doesn't silently reset a limit to its default.
 *
 * Never clamps silently: an out-of-range value is an error, because a client
 * who asked for 5 000 photos and was quietly given 1 000 will blame the
 * product when the gallery stops accepting uploads mid-event.
 */
export function normalizeEventLimits(
  input: Partial<Record<LimitKey, unknown>>,
  fallbacks: EventLimitValues
): NormalizationResult {
  const errors: string[] = [];
  const values = { ...fallbacks };

  (Object.keys(EVENT_LIMIT_CAPS) as LimitKey[]).forEach((key) => {
    const rule = EVENT_LIMIT_CAPS[key];
    const provided = toInteger(input[key]);

    if (provided === null) return; // omitted → keep the fallback

    if (provided < rule.min || provided > rule.max) {
      errors.push(
        `${rule.label} must be between ${rule.min} and ${rule.max}${rule.unit ? ` ${rule.unit}` : ""}.`
      );
      return;
    }

    values[key] = provided;
  });

  return { values, errors };
}

/** Field hint for the forms, e.g. "10 – 1000". */
export function limitHint(key: LimitKey): string {
  const rule = EVENT_LIMIT_CAPS[key];
  return `${rule.min} – ${rule.max}${rule.unit ? ` ${rule.unit}` : ""}`;
}
