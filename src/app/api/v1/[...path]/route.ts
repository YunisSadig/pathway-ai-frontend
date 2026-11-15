/**
 * The only door between the browser and the Spring Boot API. The browser calls `/api/v1/...` on THIS site; this handler calls the backend.
 *
 * Server-only configuration (never NEXT_PUBLIC_*):
 *   API_UPSTREAM_URL  the backend origin (https; http only for localhost)
 *   API_STAGING_KEY   sent as `X-Staging-Key` (the backend refuses every call without it); optional once the backend is public
 *
 * Why this exists:
 * - The staging key and the backend address stay on the server. No secret is ever in the page or in a script.
 * - The student's session is an HttpOnly cookie on THIS site. It is forwarded to the backend (and only that one cookie), and the
 *   backend's `Set-Cookie` is passed back, so JavaScript can never read it and no token sits in localStorage.
 * - State-changing calls (POST, PUT, PATCH, DELETE) are accepted only from this site's own origin (CSRF defence together with the
 *   SameSite=Lax cookie); the `Origin` header is checked here and not forwarded.
 * - The catalogue (programs, universities, discovery) is not even requested from the backend without a session cookie: the backend
 *   enforces who may see it, this is a second lock.
 * - Account answers are `no-store`; other answers keep the backend's ETag and max-age but `public` becomes `private`, so no shared
 *   cache (CDN) can ever store data that was fetched with the key.
 */
export const maxDuration = 150;

const CATALOGUE_AREAS = new Set(["programs", "universities", "discovery"]);
// "public" is the allow-listed identity data of the universities: readable without a session (the backend decides the fields)
const READ_ONLY_AREAS = new Set([...CATALOGUE_AREAS, "public"]);
const SESSION_COOKIE = "PATHWAY_SESSION";
// A sleeping free-tier backend needed 84.6 s for its first answer (measured 2026-11-15), so wait well beyond that. The function itself may
// run longer than the upstream wait (Fluid Compute on the Hobby plan allows it), otherwise the platform would cut the request first.
const UPSTREAM_TIMEOUT_MS = 130_000;
const MAX_BODY_BYTES = 64 * 1024;
// the profile picture is the one binary body: a small JPEG prepared in the browser (the server re-encodes it again)
const MAX_AVATAR_BYTES = 420 * 1024;

type Ctx = { params: Promise<{ path: string[] }> };

function problem(status: number, message: string, code?: string): Response {
  return Response.json(
    { status, message, ...(code ? { code } : {}) },
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

/** Only the session cookie, never the visitor's other cookies. */
function sessionCookieOf(request: Request): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE && rest.length)
      return `${name}=${rest.join("=")}`;
  }
  return null;
}

function clientAddress(request: Request): string | null {
  const real = request.headers.get("x-real-ip");
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const candidate = real || forwarded || "";
  return /^[0-9a-fA-F:.]{3,45}$/.test(candidate) ? candidate : null;
}

async function forward(request: Request, { params }: Ctx): Promise<Response> {
  const { path } = await params;
  const area = path[0];
  const isWrite = !["GET", "HEAD"].includes(request.method);
  const origin = upstreamOrigin();
  if (!origin) return problem(503, "The data service is not configured.");
  if (
    path.length === 0 ||
    !(area === "account" || READ_ONLY_AREAS.has(area)) ||
    path.some(
      (segment) => !/^[A-Za-z0-9._-]+$/.test(segment) || segment === "..",
    )
  ) {
    return problem(404, "Not found.");
  }
  if (isWrite && area !== "account") return problem(405, "Method not allowed.");

  if (isWrite) {
    const sent = request.headers.get("origin");
    if (!sent || sent !== new URL(request.url).origin) {
      return problem(
        403,
        "This request was not sent from the Pathway AI website.",
        "BAD_ORIGIN",
      );
    }
  }

  const cookie = sessionCookieOf(request);
  if (CATALOGUE_AREAS.has(area) && !cookie) {
    return problem(401, "Please log in.", "UNAUTHENTICATED");
  }

  const isAvatar =
    path.length === 2 && path[0] === "account" && path[1] === "avatar";
  let bytes: ArrayBuffer | undefined;
  let body: string | undefined;
  if (isWrite && isAvatar && request.method === "PUT") {
    const type = (request.headers.get("content-type") ?? "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (type !== "image/jpeg" && type !== "image/png") {
      return problem(
        415,
        "Only JPEG and PNG pictures are accepted.",
        "AVATAR_TYPE",
      );
    }
    if (Number(request.headers.get("content-length") ?? "0") > MAX_AVATAR_BYTES)
      return problem(413, "The picture is too large.", "AVATAR_TOO_LARGE");
    bytes = await request.arrayBuffer();
    if (bytes.byteLength > MAX_AVATAR_BYTES)
      return problem(413, "The picture is too large.", "AVATAR_TOO_LARGE");
  } else if (isWrite) {
    const declared = Number(request.headers.get("content-length") ?? "0");
    if (declared > MAX_BODY_BYTES)
      return problem(413, "The request is too large.");
    body = await request.text();
    if (body.length > MAX_BODY_BYTES)
      return problem(413, "The request is too large.");
  }

  const target = `${origin}/api/v1/${path.join("/")}${new URL(request.url).search}`;
  const headers: Record<string, string> = {
    Accept: isAvatar && !isWrite ? "image/*" : "application/json",
  };
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch && !isWrite) headers["If-None-Match"] = ifNoneMatch;
  if (bytes !== undefined)
    headers["Content-Type"] = request.headers
      .get("content-type")!
      .split(";")[0]
      .trim();
  else if (body !== undefined && body.length > 0)
    headers["Content-Type"] = "application/json";
  if (cookie) headers.Cookie = cookie;
  const key = process.env.API_STAGING_KEY;
  if (key) headers["X-Staging-Key"] = key;
  const visitor = clientAddress(request);
  if (visitor) headers["X-Client-IP"] = visitor;

  // The two Google sign-in steps answer with a redirect that the browser must follow; nothing else may redirect.
  const isOauthStep =
    request.method === "GET" &&
    path.length === 4 &&
    path[0] === "account" &&
    path[1] === "oauth" &&
    path[2] === "google" &&
    (path[3] === "start" || path[3] === "callback");
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: bytes ?? (body && body.length > 0 ? body : undefined),
      cache: "no-store",
      redirect: isOauthStep ? "manual" : "error",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    return problem(502, "The data service could not be reached.");
  }

  // the staging key was refused: a deployment fault, not the visitor's doing, and not something to explain to them
  if (
    upstream.status === 401 &&
    upstream.headers.get("x-pathway-gate") === "rejected"
  ) {
    return problem(502, "The data service refused the request.");
  }

  const out = new Headers();
  for (const name of ["content-type", "etag"]) {
    const value = upstream.headers.get(name);
    if (value) out.set(name, value);
  }
  const cacheControl = upstream.headers.get("cache-control");
  out.set(
    "Cache-Control",
    area === "account"
      ? isAvatar &&
        !isWrite &&
        upstream.status === 200 &&
        new URL(request.url).searchParams.has("v")
        ? "private, max-age=86400" // a picture URL carries its version, so a changed picture is a new URL
        : "no-store"
      : cacheControl
        ? cacheControl.replace(/\bpublic\b/i, "private")
        : "no-store",
  );
  // the session cookie (set at login, cleared at logout) travels back unchanged: HttpOnly, SameSite=Lax, host-only on this site
  for (const setCookie of upstream.headers.getSetCookie()) {
    if (setCookie.startsWith(`${SESSION_COOKIE}=`))
      out.append("Set-Cookie", setCookie);
  }
  if (isOauthStep && upstream.status === 302) {
    // only to this site (a page) or to Google's own authorization page: never an address an attacker could choose
    const location = upstream.headers.get("location") ?? "";
    const here = new URL(request.url).origin;
    if (
      !location.startsWith(`${here}/`) &&
      !location.startsWith("https://accounts.google.com/o/oauth2/v2/auth?")
    ) {
      return problem(502, "The data service gave an unexpected answer.");
    }
    out.set("Location", location);
    out.set("Referrer-Policy", "no-referrer");
    return new Response(null, { status: 302, headers: out });
  }
  if (upstream.status === 304)
    return new Response(null, { status: 304, headers: out });
  return new Response(upstream.status === 204 ? null : upstream.body, {
    status: upstream.status,
    headers: out,
  });
}

export const GET = forward;
export const HEAD = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
