import type { HttpError } from "@/shared/api/httpClient";

export function isHttpError(error: unknown): error is HttpError {
  return typeof error === "object" && error !== null && "status" in error;
}

export function handleHttpError(error: unknown) {
  if (isHttpError(error)) {
    if (error.handled) return;
    error.handled = true;
    // Central place to hook in toast/telemetry later.
    // eslint-disable-next-line no-console
    console.error("HTTP error", {
      status: error.status,
      message: error.message,
      url: error.url,
      body: error.body
    });
    return;
  }

  // eslint-disable-next-line no-console
  console.error("Unexpected error", error);
}

export function handleQueryError(error: unknown) {
  handleHttpError(error);
}
