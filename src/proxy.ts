import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * The site is public: a visitor opens the home page without any browser password prompt. (The old site-wide HTTP Basic password was an
 * infrastructure lock for a staging site; real students sign up and log in instead.)
 *
 * What this does:
 * - Pages that only make sense for a signed-in student send a visitor with NO session cookie to the login page and bring them back
 *   afterwards. This is a convenience only: the cookie is not validated here, and the backend authorizes every single API call.
 * - Security headers on every response.
 */
const PRIVATE_PATHS = ["/dashboard", "/profile", "/saved", "/settings"];
const SESSION_COOKIE = "PATHWAY_SESSION";

export function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isPrivatePath(pathname) && !request.cookies.has(SESSION_COOKIE)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + search);
    login.searchParams.set("reason", "required");
    return NextResponse.redirect(login);
  }
  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  if (isPrivatePath(pathname))
    response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg|favicon.ico).*)"],
};
