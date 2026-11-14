import type { ApiErrorBody } from "@/types/api";

/** One field-level problem reported by the API (never contains the rejected value). */
export interface FieldViolation {
  field: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Stable machine-readable reason from the account API, e.g. INVALID_CREDENTIALS. */
    readonly code?: string,
    readonly violations: FieldViolation[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const API_NOT_CONFIGURED = "The data service is not configured.";

/**
 * Where the browser sends API calls. It is public by design, so it must never contain a secret.
 * - an origin such as http://localhost:8080: the browser calls that backend directly (CORS applies);
 * - "same-origin": relative calls to this site's own /api/v1/* proxy route, which holds the backend
 *   address and any staging key on the server (used while the backend is access-protected);
 * - unset: "not configured" (null).
 */
export function apiBaseUrl(): string | null {
  const value = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!value) return null;
  if (value === "same-origin") return "";
  return value.replace(/\/+$/, "") || null;
}

type Params = Record<string, string | number | readonly string[] | undefined>;

export function buildQuery(params: Params = {}): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (typeof value === "object") {
      if (value.length) q.set(key, value.join(","));
    } else {
      q.set(key, String(value));
    }
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

/**
 * Typed GET. Throws `ApiError` with status 0 when no backend is configured or it cannot be
 * reached, and with the HTTP status for non-2xx responses. Aborted requests rethrow the abort.
 */
export async function apiGet<T>(
  path: string,
  params?: Params,
  init?: RequestInit,
): Promise<T> {
  const base = apiBaseUrl();
  if (base === null) throw new ApiError(0, API_NOT_CONFIGURED);

  let res: Response;
  try {
    res = await fetch(`${base}${path}${buildQuery(params)}`, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new ApiError(0, "The data service could not be reached.");
  }
  if (!res.ok) {
    const body = (await res
      .json()
      .catch(() => null)) as Partial<ApiErrorBody> | null;
    throw new ApiError(
      res.status,
      body?.message ?? res.statusText,
      (body as { code?: string } | null)?.code,
    );
  }
  return (await res.json()) as T;
}

/**
 * JSON write (POST, PUT, PATCH, DELETE) for the account API. The session lives in an HttpOnly cookie that the browser attaches by
 * itself: nothing here reads, stores or sends a token. A 204 resolves to undefined.
 */
export async function apiSend<T = void>(
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const base = apiBaseUrl();
  if (base === null) throw new ApiError(0, API_NOT_CONFIGURED);
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method,
      credentials: "include",
      headers:
        body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      "The service could not be reached. Check your connection and try again.",
    );
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as {
      message?: string;
      code?: string;
      violations?: FieldViolation[];
    } | null;
    throw new ApiError(
      res.status,
      err?.message ?? res.statusText,
      err?.code,
      err?.violations ?? [],
    );
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
