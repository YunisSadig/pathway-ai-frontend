#!/usr/bin/env node
/**
 * Health check for a deployed frontend and the backend it talks to. It only reads.
 *
 *   node scripts/verify-deployment.mjs <frontend-url> [<api-url>]
 *   npm run verify:deployment -- https://example.vercel.app https://api.example.com
 *
 * Checks, in order:
 *   1. the four primary pages answer 200 with HTML
 *   2. the frontend is built against an API URL (found in the shipped JavaScript) and that URL is https
 *   3. (with <api-url>) the API answers /api/v1/programs, and a browser-style request from the frontend origin
 *      is allowed by CORS (the backend must list the exact frontend origin in CORS_ALLOWED_ORIGINS)
 * Exit code 0 = healthy, 1 = a check failed, 2 = bad usage.
 */
const [, , siteArg, apiArg] = process.argv;
if (!siteArg) {
  console.error(
    "Usage: node scripts/verify-deployment.mjs <frontend-url> [<api-url>]",
  );
  process.exit(2);
}
const site = siteArg.replace(/\/+$/, "");
// Protected staging: pass the word "same-origin" as <api-url> and set SITE_BASIC_AUTH=user:password in the environment.
// Pages and the site's own /api/v1 proxy are read with that password; the site must answer 401 without it
// (EXPECT_PROTECTED, default true in this mode).
const sameOrigin = apiArg === "same-origin";
const api = apiArg && !sameOrigin ? apiArg.replace(/\/+$/, "") : null;
const origin = new URL(site).origin;
const siteAuth = process.env.SITE_BASIC_AUTH
  ? {
      Authorization: `Basic ${Buffer.from(process.env.SITE_BASIC_AUTH).toString("base64")}`,
    }
  : {};

let failed = 0;
const ok = (m) => console.log(`  ok    ${m}`);
const bad = (m) => {
  failed++;
  console.log(`  FAIL  ${m}`);
};
const warn = (m) => console.log(`  warn  ${m}`);

const get = async (url, init) => {
  try {
    const sameSite = new URL(url).origin === origin;
    return await fetch(url, {
      redirect: "follow",
      ...init,
      headers: { ...(sameSite ? siteAuth : {}), ...(init?.headers ?? {}) },
    });
  } catch (e) {
    return { ok: false, status: 0, error: e.message };
  }
};

console.log(`Frontend: ${site}`);
for (const path of ["/", "/universities", "/scholarships", "/how-it-works"]) {
  const res = await get(site + path);
  const type = res.headers?.get?.("content-type") ?? "";
  if (res.status === 200 && type.includes("text/html")) ok(`${path} -> 200`);
  else bad(`${path} -> ${res.status || res.error}`);
}

if (sameOrigin) {
  console.log("API through the site's own proxy (same-origin)");
  const list = await get(`${site}/api/v1/programs?size=1`, {
    headers: { Accept: "application/json" },
  });
  const body = list.status === 200 ? await list.json().catch(() => null) : null;
  if (body && Array.isArray(body.content))
    ok(`/api/v1/programs -> 200 (${body.totalElements} programs)`);
  else
    bad(`/api/v1/programs through the proxy -> ${list.status || list.error}`);
  const cc = list.headers?.get?.("cache-control") ?? "";
  if (/\bpublic\b/i.test(cc))
    bad(`the proxy answered a shared-cacheable Cache-Control (${cc})`);
  else ok(`cache policy is browser-only (${cc || "none"})`);
  if ((process.env.EXPECT_PROTECTED ?? "true") === "true") {
    const anon = await fetch(site + "/", { redirect: "manual" }).catch(() => ({
      status: 0,
    }));
    const anonApi = await fetch(site + "/api/v1/programs?size=1").catch(() => ({
      status: 0,
    }));
    if (anon.status === 401 && anonApi.status === 401)
      ok("the site and its API answer 401 without the password");
    else
      bad(
        `unauthenticated access is not refused (site ${anon.status}, api ${anonApi.status})`,
      );
  }
}

// NEXT_PUBLIC_API_BASE_URL is inlined into the client bundle at build time, so the shipped JavaScript must
// contain the API origin. Without <api-url> we cannot know what to look for.
if (api) {
  const html = await (await get(site + "/universities")).text?.();
  const scripts = [...(html ?? "").matchAll(/src="([^"]+.js[^"]*)"/g)].map(
    (m) => m[1],
  );
  let found = false;
  for (const src of scripts) {
    const res = await get(new URL(src, site).toString());
    if (res.ok && (await res.text()).includes(new URL(api).origin)) {
      found = true;
      break;
    }
  }
  if (!found)
    bad(
      `the shipped JavaScript does not contain ${new URL(api).origin}: NEXT_PUBLIC_API_BASE_URL was not set (or was different) when this build ran, so the site cannot reach the API. Set it and redeploy.`,
    );
  else if (
    !api.startsWith("https://") &&
    !new URL(site).hostname.match(/^(localhost|127.0.0.1)$/)
  )
    bad("production must use an https API URL");
  else ok(`built against ${new URL(api).origin}`);
} else if (!sameOrigin) {
  warn(
    "pass the API URL as the second argument to verify the build is wired to it",
  );
}

if (api) {
  console.log(`API: ${api}`);
  const list = await get(`${api}/api/v1/programs?size=1`, {
    headers: { Accept: "application/json" },
  });
  if (list.status === 200) {
    const body = await list.json().catch(() => null);
    if (body && Array.isArray(body.content))
      ok(`/api/v1/programs -> 200 (${body.totalElements} programs)`);
    else bad("/api/v1/programs returned 200 but not a page envelope");
  } else bad(`/api/v1/programs -> ${list.status || list.error}`);

  const cors = await get(`${api}/api/v1/programs?size=1`, {
    headers: { Accept: "application/json", Origin: origin },
  });
  const allowed = cors.headers?.get?.("access-control-allow-origin");
  if (allowed === origin) ok(`CORS allows ${origin}`);
  else
    bad(
      `CORS does not allow ${origin} (got ${allowed ?? "no header"}, status ${cors.status}). Add it to the backend CORS_ALLOWED_ORIGINS`,
    );
}

console.log(failed ? `\n${failed} check(s) failed` : "\nHealthy");
process.exit(failed ? 1 : 0);
