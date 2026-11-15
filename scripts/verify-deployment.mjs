#!/usr/bin/env node
/**
 * Health check for a deployed frontend and the backend behind it. It only reads (no account is created here).
 *
 *   node scripts/verify-deployment.mjs <frontend-url> same-origin
 *   node scripts/verify-deployment.mjs <frontend-url> [<api-url>]     (frontend that calls a backend directly)
 *
 * The site is public: no password is needed or sent. The checks prove what must be true BEFORE a visitor arrives:
 *   1. the public pages answer 200 with HTML and never ask for a browser password (no WWW-Authenticate)
 *   2. private pages send a visitor without a session to the login page
 *   3. the academic catalogue is closed to anonymous visitors, also with a forged session cookie
 *   4. account answers are not cacheable and the account service answers
 * Exit code 0 = healthy, 1 = a check failed, 2 = bad usage.
 */
const [, , siteArg, apiArg] = process.argv;
if (!siteArg) {
  console.error(
    "Usage: node scripts/verify-deployment.mjs <frontend-url> [same-origin|<api-url>]",
  );
  process.exit(2);
}
const site = siteArg.replace(/\/+$/, "");
const sameOrigin = apiArg === "same-origin";
const api = apiArg && !sameOrigin ? apiArg.replace(/\/+$/, "") : null;
const origin = new URL(site).origin;
// The catalogue may be opened deliberately (CATALOGUE_PUBLIC); the default and the current state is closed.
const EXPECT_CATALOGUE_CLOSED =
  (process.env.EXPECT_CATALOGUE_CLOSED ?? "true") === "true";

let failed = 0;
const ok = (m) => console.log(`  ok    ${m}`);
const bad = (m) => {
  failed++;
  console.log(`  FAIL  ${m}`);
};
const warn = (m) => console.log(`  warn  ${m}`);

const get = async (url, init) => {
  try {
    return await fetch(url, { redirect: "follow", ...init });
  } catch (e) {
    return { ok: false, status: 0, error: e.message, headers: new Headers() };
  }
};

console.log(`Frontend: ${site}`);

// EXPECTED_SHA: after a merge, wait until the deployment that serves the site was built from that commit (GET /api/version).
const expected = process.env.EXPECTED_SHA;
if (expected) {
  const deadline = Date.now() + 25 * 60 * 1000;
  let served = null;
  while (Date.now() < deadline) {
    const res = await get(`${site}/api/version`);
    served = res.status === 200 ? (await res.json())?.commit : null;
    if (served === expected) break;
    console.log(
      `  waiting: site serves ${served ? served.slice(0, 7) : "nothing yet"}, want ${expected.slice(0, 7)}`,
    );
    await new Promise((r) => setTimeout(r, 20_000));
  }
  if (served === expected)
    ok(`serves the merged commit ${expected.slice(0, 7)}`);
  else {
    bad(
      `the site does not serve the merged commit (serves ${served ?? "nothing"})`,
    );
    console.log("\n1 check(s) failed");
    process.exit(1);
  }
}

console.log("Public pages");
for (const path of [
  "/",
  "/login",
  "/signup",
  "/about",
  "/privacy",
  "/terms",
  "/contact",
  "/how-it-works",
  "/scholarships",
  "/universities",
  "/settings",
]) {
  const res = await get(site + path);
  const type = res.headers?.get?.("content-type") ?? "";
  const challenge = res.headers?.get?.("www-authenticate");
  if (challenge) bad(`${path} asks for a browser password (${challenge})`);
  else if (res.status === 200 && type.includes("text/html"))
    ok(`${path} -> 200`);
  else bad(`${path} -> ${res.status || res.error}`);
}

console.log("Private pages");
for (const path of ["/dashboard", "/profile", "/saved"]) {
  const res = await get(site + path, { redirect: "manual" });
  const where = res.headers?.get?.("location") ?? "";
  if ([302, 303, 307, 308].includes(res.status) && where.includes("/login"))
    ok(`${path} -> login page for a visitor`);
  else bad(`${path} did not redirect a visitor to /login (${res.status})`);
}

if (sameOrigin) {
  console.log("API through the site's own proxy (same-origin)");
  const config = await get(`${site}/api/v1/account/config`, {
    headers: { Accept: "application/json" },
  });
  const configBody =
    config.status === 200 ? await config.json().catch(() => null) : null;
  if (configBody && typeof configBody.registrationOpen === "boolean") {
    ok(
      `account service answers (registrationOpen=${configBody.registrationOpen}, emailDelivery=${configBody.emailDeliveryAvailable}, cataloguePublic=${configBody.cataloguePublic})`,
    );
  } else bad(`/api/v1/account/config -> ${config.status || config.error}`);
  const cc = config.headers?.get?.("cache-control") ?? "";
  if (/no-store/i.test(cc)) ok("account answers are no-store");
  else bad(`account answers are cacheable (${cc || "no Cache-Control"})`);

  const me = await get(`${site}/api/v1/account/me`);
  if (me.status === 401) ok("an anonymous visitor has no account (401)");
  else bad(`/api/v1/account/me without a session -> ${me.status}`);

  if (EXPECT_CATALOGUE_CLOSED) {
    for (const area of ["programs", "universities", "discovery/options"]) {
      const anon = await get(`${site}/api/v1/${area}?size=1`);
      const forged = await get(`${site}/api/v1/${area}?size=1`, {
        headers: { Cookie: "PATHWAY_SESSION=forged-session-value" },
      });
      if (anon.status === 401 && forged.status === 401)
        ok(`/api/v1/${area} is closed to anonymous and forged sessions`);
      else
        bad(
          `/api/v1/${area} is not closed (anonymous ${anon.status}, forged ${forged.status})`,
        );
    }
  }
}

if (api) {
  console.log(`API: ${api}`);
  const config = await get(`${api}/api/v1/account/config`, {
    headers: { Accept: "application/json", Origin: origin },
  });
  if (config.status === 200) ok("/api/v1/account/config -> 200");
  else bad(`/api/v1/account/config -> ${config.status || config.error}`);
  if (EXPECT_CATALOGUE_CLOSED) {
    const anon = await get(`${api}/api/v1/programs?size=1`);
    if (anon.status === 401 || anon.status === 403)
      ok(`the API refuses an anonymous catalogue request (${anon.status})`);
    else
      bad(`the API answered an anonymous catalogue request (${anon.status})`);
  }
} else if (!sameOrigin) {
  warn("pass 'same-origin' or the API URL as the second argument");
}

console.log(failed ? `\n${failed} check(s) failed` : "\nHealthy");
process.exit(failed ? 1 : 0);
