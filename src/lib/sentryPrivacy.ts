interface RequestData {
  cookies?: unknown;
  headers?: unknown;
  data?: unknown;
  url?: string | null;
}

interface ErrorEventData {
  user?: unknown;
  request?: RequestData;
}

export function scrubSentryEvent<T extends ErrorEventData>(event: T): T {
  delete event.user;
  if (event.request) {
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.data;
    if (event.request.url) {
      try {
        event.request.url = new URL(event.request.url).origin;
      } catch {
        delete event.request.url;
      }
    }
  }
  return event;
}
