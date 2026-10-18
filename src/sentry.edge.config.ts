import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "@/lib/sentryPrivacy";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    beforeSend: scrubSentryEvent,
  });
}
