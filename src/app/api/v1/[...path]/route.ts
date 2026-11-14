/**
 * Same-origin proxy to the Spring Boot API, used while the backend is access-protected (data-reuse rights not yet established)
 * and as the hosted default: the browser calls `/api/v1/...` on this site, this handler calls the backend with the staging key.
 *
 * Server-only configuration (never NEXT_PUBLIC_*):
 *   API_UPSTREAM_URL  the backend origin (https; http only for localhost)
 *   API_STAGING_KEY   sent as `X-Staging-Key`; optional once the backend is public
 *
 * Read-only: GET only, an allow-list of API areas, no cookies or credentials forwarded, a bounded wait (a sleeping free-tier
 * backend takes about a minute to wake). Nothing is cached here: the backend's ETag and max-age are passed through, with
 * `public` turned into `private` so that no shared cache (CDN) can ever store data that was fetched with the key.
 */
const ALLOWED_AREAS = new Set(["programs", "universities", "discovery"]);
// A sleeping free-tier backend needed 84.6 s for its first answer (measured 2026-11-15), so wait well beyond that. The function itself may
// run longer than the upstream wait (Fluid Compute on the Hobby plan allows it), otherwise the platform would cut the request first.
export const maxDuration = 150;
const UPSTREAM_TIMEOUT_MS = 130_000;

type Ctx = { params: Promise<{ path: string[] }> };

function problem(status: number, message: string): Response {
  return Response.json(
    { status, message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function upstreamOrigin(): string | null {
  const raw = process.env.API_UPSTREAM_URL?.trim().replace(/\/+$/, "");
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const local = ["localhost", "127.0.0.1"].includes(url.hostname);
    if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: Ctx,
): Promise<Response> {
  const { path } = await params;
  const origin = upstreamOrigin();
  if (!origin) return problem(503, "The data service is not configured.");
  if (
    path.length === 0 ||
    !ALLOWED_AREAS.has(path[0]) ||
    path.some(
      (segment) => !/^[A-Za-z0-9._-]+$/.test(segment) || segment === "..",
    )
  ) {
    return problem(404, "Not found.");
  }

  const target = `${origin}/api/v1/${path.join("/")}${new URL(request.url).search}`;
  const headers: Record<string, string> = { Accept: "application/json" };
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch) headers["If-None-Match"] = ifNoneMatch;
  const key = process.env.API_STAGING_KEY;
  if (key) headers["X-Staging-Key"] = key;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      headers,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    return problem(502, "The data service could not be reached.");
  }

  const out = new Headers();
  for (const name of ["content-type", "etag"]) {
    const value = upstream.headers.get(name);
    if (value) out.set(name, value);
  }
  const cacheControl = upstream.headers.get("cache-control");
  out.set(
    "Cache-Control",
    cacheControl ? cacheControl.replace(/\bpublic\b/i, "private") : "no-store",
  );
  // a gate rejection upstream is a deployment fault, not a client error: do not leak the reason
  if (upstream.status === 401 || upstream.status === 429) {
    return problem(502, "The data service refused the request.");
  }
  if (upstream.status === 304)
    return new Response(null, { status: 304, headers: out });
  return new Response(upstream.body, { status: upstream.status, headers: out });
}
