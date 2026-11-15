import { crc32, deflateSync } from "node:zlib";
import type { Page, Route } from "@playwright/test";
import { API } from "./api";

/**
 * A stateful stand-in for the account API: obviously synthetic people, held in memory for one test. The real cookie handling is not
 * simulated by the API (it is a different origin here); the fake sets and clears the site's own PATHWAY_SESSION cookie in the browser
 * so the page-level redirect behaves like production. Server-side authorization is covered by the backend integration tests.
 */
export interface FakeAccount {
  email: string;
  password: string;
  displayName: string | null;
  /** A synthetic account that signs in with Google only (no password). */
  googleOnly?: boolean;
  id: string;
}

export interface FakeAccountApi {
  accounts: FakeAccount[];
  profiles: Map<string, Record<string, unknown>>;
  saved: Map<string, { programs: string[]; universities: string[] }>;
  current: FakeAccount | null;
  calls: { method: string; path: string; body: unknown }[];
  /** When set, the next call to this path answers with this status. */
  failNext: Map<string, number>;
  /** Paths whose next call never gets an answer (a hung or sleeping backend). */
  hang: Set<string>;
  /** Milliseconds to wait before answering a path (a slow cold start). */
  delays: Map<string, number>;
  /** Simulates a session that ended on the server. */
  expireSession(): Promise<void>;
  options: {
    registrationOpen: boolean;
    emailDeliveryAvailable: boolean;
    googleLoginAvailable?: boolean;
  };
  /** What GET /options/destinations answers. Restricted by default, like an account without catalogue access. */
  destinations: {
    restricted: boolean;
    countries: { code: string; name: string }[];
    universities: { slug: string; name: string; countryCode: string }[];
  };
  /** The v2 profile document per account, as the server would hold it. */
  documents: Map<string, Record<string, unknown>>;
  avatars: Map<string, number>;
  /** Every language the page asked the server to remember. */
  languages: string[];
}

/** What the backend's GET /options answers (the five supported countries, the scales, the currencies, ...). */
export const OPTIONS = {
  countries: ["AZ", "KZ", "GE", "UZ", "KG"].map((code, i) => ({
    code,
    defaultCurrency: ["AZN", "KZT", "GEL", "UZS", "KGS"][i],
  })),
  scales: [
    { scale: "FIVE_POINT", min: "1", max: "5", letters: false },
    { scale: "TEN_POINT", min: "1", max: "10", letters: false },
    { scale: "PERCENT_100", min: "0", max: "100", letters: false },
    { scale: "GPA_4", min: "0", max: "4", letters: false },
    { scale: "LETTER", min: null, max: null, letters: true },
    { scale: "OTHER", min: null, max: null, letters: false },
  ],
  letters: [
    "A+",
    "A",
    "A-",
    "B+",
    "B",
    "B-",
    "C+",
    "C",
    "C-",
    "D+",
    "D",
    "D-",
    "E",
    "FX",
    "F",
  ],
  specializations: [
    ...[
      "computer_science",
      "software_engineering",
      "information_technology",
      "cybersecurity",
      "data_science",
      "artificial_intelligence",
      "information_systems",
    ].map((code) => ({ code, area: "CS_IT" })),
    ...[
      "economics",
      "finance",
      "accounting",
      "business_administration",
      "business_analytics",
      "management",
    ].map((code) => ({ code, area: "ECON_BUSINESS" })),
  ],
  skills: [
    ...[
      "java",
      "python",
      "javascript_typescript",
      "csharp",
      "react",
      "spring_boot",
      "cloud_computing",
      "machine_learning",
    ].map((code) => ({ code, group: "IT" })),
    ...["sql", "data_analysis"].map((code) => ({ code, group: "BOTH" })),
    ...[
      "excel",
      "financial_analysis",
      "accounting_skill",
      "business_analysis",
      "statistics",
      "econometrics",
      "power_bi",
      "financial_modelling",
    ].map((code) => ({ code, group: "ECON" })),
  ],
  currencies: [
    "AZN",
    "KZT",
    "GEL",
    "UZS",
    "KGS",
    "EUR",
    "USD",
    "PLN",
    "CZK",
    "HUF",
    "RON",
    "DKK",
    "SEK",
  ],
  commonCurrencies: ["EUR", "USD"],
  languages: ["en", "ru"],
  toeflNewScaleEffectiveFrom: "2026-01-21",
};

/** A valid 2x2 PNG built here (with real CRCs), so an <img> always decodes it. */
function makePng(): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(2, 0); // width
  header.writeUInt32BE(2, 4); // height
  header[8] = 8; // bit depth
  header[9] = 2; // RGB
  const row = Buffer.from([0, 66, 99, 245, 66, 99, 245]); // filter byte + two pixels
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.concat([row, row]))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
const TINY_PICTURE = makePng();

const EMPTY_PROFILE = {
  currentCountry: null,
  currentUniversity: null,
  currentDegreeLevel: null,
  fieldOfStudy: null,
  gpa: null,
  gpaScaleMax: null,
  targetDegreeLevel: null,
  intakeSeason: null,
  intakeYear: null,
  maxAnnualTuition: null,
  maxAnnualTuitionCurrency: null,
  languageQualifications: [],
  preferredDestinations: [],
  updatedAt: null,
};

const SITE = "http://localhost:3100";

export async function mockAccountApi(
  page: Page,
  options: Partial<FakeAccountApi["options"]> = {},
): Promise<FakeAccountApi> {
  const state: FakeAccountApi = {
    accounts: [],
    profiles: new Map(),
    saved: new Map(),
    current: null,
    calls: [],
    failNext: new Map(),
    hang: new Set(),
    delays: new Map(),
    options: {
      registrationOpen: true,
      emailDeliveryAvailable: false,
      ...options,
    },
    destinations: { restricted: true, countries: [], universities: [] },
    documents: new Map(),
    avatars: new Map(),
    languages: [],
    async expireSession() {
      state.current = null;
      await page.context().clearCookies({ name: "PATHWAY_SESSION" });
    },
  };

  const setSession = async (on: boolean) => {
    if (on) {
      await page
        .context()
        .addCookies([
          { name: "PATHWAY_SESSION", value: "synthetic-session", url: SITE },
        ]);
    } else {
      await page.context().clearCookies({ name: "PATHWAY_SESSION" });
    }
  };

  const reply = (route: Route, status: number, body?: unknown): Promise<void> =>
    route.fulfill({
      status,
      contentType: "application/json",
      headers: {
        "access-control-allow-origin": SITE,
        "access-control-allow-credentials": "true",
        "access-control-allow-headers": "content-type",
        "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const error = (route: Route, status: number, code: string, message: string) =>
    reply(route, status, { status, code, message });

  const view = (a: FakeAccount) => ({
    id: a.id,
    email: a.email,
    displayName: a.displayName,
    role: "USER",
    emailVerified: false,
    catalogueAccess: false,
    createdAt: "2000-01-01T00:00:00Z",
    hasPassword: !a.googleOnly,
    providers: a.googleOnly ? ["GOOGLE"] : [],
    avatar: {
      present: (state.avatars.get(a.id) ?? 0) > 0,
      version: state.avatars.get(a.id) ?? 0,
    },
  });

  await page.route(
    new RegExp(`^${API}/api/v1/account(/.*)?$`),
    async (route) => {
      const request = route.request();
      const method = request.method();
      if (method === "OPTIONS") return reply(route, 204);
      const path = new URL(request.url()).pathname.replace(
        "/api/v1/account",
        "",
      );
      let body: unknown = undefined;
      try {
        body = request.postDataJSON();
      } catch {
        body = undefined;
      }
      state.calls.push({ method, path, body });
      if (state.hang.has(path)) {
        state.hang.delete(path);
        return new Promise<void>(() => {});
      }
      const wait = state.delays.get(path);
      if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
      const failure = state.failNext.get(path);
      if (failure) {
        state.failNext.delete(path);
        return error(route, failure, "SERVER_ERROR", "Something went wrong.");
      }
      const input = (body ?? {}) as Record<string, unknown>;
      const me = state.current;

      if (path === "/config" && method === "GET") {
        return reply(route, 200, { ...state.options, cataloguePublic: false });
      }
      if (path === "/register" && method === "POST") {
        const email = String(input.email ?? "").toLowerCase();
        if (state.accounts.some((a) => a.email === email)) {
          return error(
            route,
            409,
            "EMAIL_TAKEN",
            "An account with this email address already exists.",
          );
        }
        const account: FakeAccount = {
          id: `synthetic-${state.accounts.length + 1}`,
          email,
          password: String(input.password),
          displayName: (input.displayName as string) || null,
        };
        state.accounts.push(account);
        state.current = account;
        await setSession(true);
        return reply(route, 201, {
          status: "CREATED",
          message: "Your account was created.",
          account: view(account),
        });
      }
      if (path === "/login" && method === "POST") {
        const account = state.accounts.find(
          (a) =>
            a.email === String(input.email ?? "").toLowerCase() &&
            a.password === input.password,
        );
        if (!account) {
          return error(
            route,
            401,
            "INVALID_CREDENTIALS",
            "The email address or the password is not correct.",
          );
        }
        state.current = account;
        await setSession(true);
        return reply(route, 200, view(account));
      }
      if (path === "/logout" && method === "POST") {
        state.current = null;
        await setSession(false);
        return reply(route, 204);
      }
      if (!me) return error(route, 401, "UNAUTHENTICATED", "Please log in.");

      if (path === "/oauth/google/link" && method === "POST") {
        if (input.password !== me.password)
          return error(
            route,
            403,
            "WRONG_PASSWORD",
            "Your password is not correct.",
          );
        return reply(route, 200, {
          url: "/settings?section=security&google=linked",
        });
      }
      if (path === "/me" && method === "GET")
        return reply(route, 200, view(me));
      if (path === "/me" && method === "PATCH") {
        me.displayName = (input.displayName as string) || null;
        return reply(route, 200, view(me));
      }
      if (path === "/profile" && method === "GET") {
        return reply(route, 200, state.profiles.get(me.id) ?? EMPTY_PROFILE);
      }
      if (path === "/profile" && method === "PUT") {
        const profile = {
          ...EMPTY_PROFILE,
          ...input,
          updatedAt: "2000-01-02T00:00:00Z",
        };
        state.profiles.set(me.id, profile);
        return reply(route, 200, profile);
      }
      if (path === "/profile" && method === "DELETE") {
        state.profiles.delete(me.id);
        return reply(route, 204);
      }
      const savedUniversity = path.match(
        /^\/saved\/universities\/([a-z0-9-]+)$/,
      );
      if (savedUniversity && (method === "PUT" || method === "DELETE")) {
        const mine = state.saved.get(me.id) ?? {
          programs: [],
          universities: [],
        };
        mine.universities = mine.universities.filter(
          (x) => x !== savedUniversity[1],
        );
        if (method === "PUT") mine.universities.push(savedUniversity[1]);
        state.saved.set(me.id, mine);
        return reply(route, 204);
      }
      if (path === "/saved" && method === "GET") {
        const mine = state.saved.get(me.id) ?? {
          programs: [],
          universities: [],
        };
        return reply(route, 200, {
          catalogueVisible: false,
          programs: mine.programs.map((identifier) => ({
            identifier,
            savedAt: "2000-01-02T00:00:00Z",
            available: false,
            name: null,
            universityName: null,
            universitySlug: null,
            degreeLevel: null,
          })),
          universities: mine.universities.map((slug) => ({
            slug,
            savedAt: "2000-01-02T00:00:00Z",
            available: true,
            name: "Synthetic University",
            countryName: "Finland",
          })),
        });
      }
      if (path === "/change-password" && method === "POST") {
        if (input.currentPassword !== me.password) {
          return error(
            route,
            400,
            "INVALID_CREDENTIALS",
            "The current password is not correct.",
          );
        }
        me.password = String(input.newPassword);
        return reply(route, 200, { message: "Password changed." });
      }
      if (path === "" && method === "DELETE") {
        if (input.password !== me.password) {
          return error(
            route,
            400,
            "INVALID_CREDENTIALS",
            "The password is not correct.",
          );
        }
        state.accounts = state.accounts.filter((a) => a !== me);
        state.profiles.delete(me.id);
        state.saved.delete(me.id);
        state.current = null;
        await setSession(false);
        return reply(route, 204);
      }
      if (path === "/export" && method === "GET") {
        return reply(route, 200, {
          account: view(me),
          profile: state.profiles.get(me.id) ?? null,
        });
      }
      // ---- student profile v2
      const emptyDoc = {
        skills: [],
        internships: [],
        volunteering: [],
        exams: [],
        destinations: [],
        preferredUniversities: [],
        onboarding: { status: "NOT_STARTED", step: 0 },
      };
      const profileView = () => {
        const profile = (state.documents.get(me.id) ?? emptyDoc) as {
          onboarding?: { status?: string };
        };
        const done = profile.onboarding?.status === "COMPLETED";
        const version = state.avatars.get(me.id) ?? 0;
        return {
          profile,
          avatar: { present: version > 0, version },
          completeness: {
            complete: done,
            missing: done ? [] : ["citizenship"],
          },
          legacy: null,
          updatedAt: null,
        };
      };
      if (path === "/options" && method === "GET")
        return reply(route, 200, OPTIONS);
      if (path === "/options/destinations" && method === "GET")
        return reply(route, 200, state.destinations);
      if (path === "/student-profile" && method === "GET")
        return reply(route, 200, profileView());
      if (path === "/student-profile" && method === "PUT") {
        const previous = state.documents.get(me.id) as
          { onboarding?: { status?: string } } | undefined;
        const onboarding = {
          status:
            previous?.onboarding?.status === "COMPLETED"
              ? "COMPLETED"
              : "IN_PROGRESS",
          step: (input.onboarding as { step?: number } | undefined)?.step ?? 0,
        };
        state.documents.set(me.id, { ...emptyDoc, ...input, onboarding });
        return reply(route, 200, profileView());
      }
      if (path === "/student-profile/complete" && method === "POST") {
        const doc = (state.documents.get(me.id) ?? emptyDoc) as Record<
          string,
          unknown
        >;
        state.documents.set(me.id, {
          ...doc,
          onboarding: { status: "COMPLETED", step: 5 },
        });
        return reply(route, 200, profileView());
      }
      if (path === "/language" && method === "PUT") {
        state.languages.push(String(input.language));
        return reply(route, 204);
      }
      if (path === "/avatar" && method === "PUT") {
        const version = (state.avatars.get(me.id) ?? 0) + 1;
        state.avatars.set(me.id, version);
        return reply(route, 200, { present: true, version });
      }
      if (path === "/avatar" && method === "DELETE") {
        state.avatars.delete(me.id);
        return reply(route, 204);
      }
      if (path === "/avatar" && method === "GET") {
        if (!state.avatars.has(me.id))
          return error(route, 404, "NOT_FOUND", "No picture.");
        return route.fulfill({
          status: 200,
          contentType: "image/png",
          headers: {
            "access-control-allow-origin": SITE,
            "access-control-allow-credentials": "true",
          },
          body: TINY_PICTURE,
        });
      }
      return error(route, 404, "NOT_FOUND", "Not found.");
    },
  );
  return state;
}
