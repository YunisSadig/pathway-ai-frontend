import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Access control for a deployment that must not be public yet (the Studyinfo reuse rights are not established).
 *
 * - `SITE_BASIC_AUTH=user:password` (server env) puts HTTP Basic authentication in front of every page and `/api/v1/*`.
 * - `PUBLIC_LAUNCH=true` switches the control off; it is the single deliberate switch.
 * - In a production build with neither set, the site answers 503 instead of silently being public (fail closed).
 * Local development and the test server are unaffected (they are not production builds, or set PUBLIC_LAUNCH).
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1)
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function evaluateAccess(
  authorization: string | null,
  env: { SITE_BASIC_AUTH?: string; PUBLIC_LAUNCH?: string; NODE_ENV?: string },
): "allow" | "challenge" | "unconfigured" {
  if (env.PUBLIC_LAUNCH === "true") return "allow";
  const expected = env.SITE_BASIC_AUTH?.trim();
  if (!expected)
    return env.NODE_ENV === "production" ? "unconfigured" : "allow";
  if (!authorization?.startsWith("Basic ")) return "challenge";
  let supplied = "";
  try {
    supplied = atob(authorization.slice(6).trim());
  } catch {
    return "challenge";
  }
  return safeEqual(supplied, expected) ? "allow" : "challenge";
}

export function proxy(request: NextRequest) {
  const decision = evaluateAccess(request.headers.get("authorization"), {
    SITE_BASIC_AUTH: process.env.SITE_BASIC_AUTH,
    PUBLIC_LAUNCH: process.env.PUBLIC_LAUNCH,
    NODE_ENV: process.env.NODE_ENV,
  });
  if (decision === "allow") return NextResponse.next();
  if (decision === "unconfigured") {
    return new NextResponse(
      "This deployment is not configured for access yet.",
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Pathway AI staging", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
