import { ApiError } from "@/lib/api/client";

/** A message that is safe and useful to show: the API's own text for known reasons, a generic one otherwise. */
export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return error.message;
    if (error.status === 429) {
      return "Too many attempts. Please wait a few minutes and try again.";
    }
    if (error.status >= 500 || error.status === 502) {
      return "The service had a problem. Please try again in a moment.";
    }
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

/** Field name -> message, for showing each API violation under its own input. */
export function fieldErrors(error: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (error instanceof ApiError) {
    for (const v of error.violations) {
      if (!(v.field in out)) out[v.field] = v.message;
    }
  }
  return out;
}
