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
  /** Simulates a session that ended on the server. */
  expireSession(): Promise<void>;
  options: { registrationOpen: boolean; emailDeliveryAvailable: boolean };
}

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
    options: {
      registrationOpen: true,
      emailDeliveryAvailable: false,
      ...options,
    },
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
            available: false,
            name: null,
            countryName: null,
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
      return error(route, 404, "NOT_FOUND", "Not found.");
    },
  );
  return state;
}
