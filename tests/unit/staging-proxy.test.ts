import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST, PUT } from "@/app/api/v1/[...path]/route";
import { NextRequest } from "next/server";
import { isPrivatePath, proxy } from "@/proxy";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const COOKIE = { cookie: "PATHWAY_SESSION=abc; other=zzz" };

describe("page proxy", () => {
  it("knows which pages are private", () => {
    for (const p of ["/dashboard", "/profile", "/profile/edit", "/saved"])
      expect(isPrivatePath(p)).toBe(true);
    for (const p of [
      "/",
      "/login",
      "/signup",
      "/programs",
      "/profiles",
      "/about",
      "/settings",
    ])
      expect(isPrivatePath(p)).toBe(false);
  });

  it("sends a visitor without a session cookie to log in and remembers the page", () => {
    const res = proxy(new NextRequest("https://site.test/profile/edit?x=1"));
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/profile/edit?x=1");
  });

  it("never asks for a browser password and serves public pages with security headers", () => {
    const res = proxy(new NextRequest("https://site.test/"));
    expect(res.status).toBe(200);
    expect(res.headers.get("www-authenticate")).toBeNull();
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("lets a private page through when a session cookie exists, uncached", () => {
    const res = proxy(
      new NextRequest("https://site.test/dashboard", { headers: COOKIE }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});

function call(
  path: string[],
  search = "",
  headers: Record<string, string> = {},
) {
  return GET(
    new Request(`https://site.test/api/v1/${path.join("/")}${search}`, {
      headers,
    }),
    {
      params: Promise.resolve({ path }),
    },
  );
}

describe("same-origin API proxy", () => {
  it("reports 503 when no upstream is configured or it is not https", async () => {
    expect((await call(["programs"])).status).toBe(503);
    vi.stubEnv("API_UPSTREAM_URL", "http://api.example.com");
    expect((await call(["programs"])).status).toBe(503);
  });

  it("sends the staging key upstream, never back to the browser, and keeps the query", async () => {
    vi.stubEnv("API_UPSTREAM_URL", "https://api.example.com/");
    vi.stubEnv("API_STAGING_KEY", "the-key");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('{"content":[]}', {
        status: 200,
        headers: {
          "content-type": "application/json",
          etag: '"e1"',
          "cache-control": "public, max-age=300, must-revalidate",
          "x-staging-key": "echo",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const res = await call(["programs"], "?q=bio&page=1", {
      ...COOKIE,
      authorization: "Basic eDp5",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example.com/api/v1/programs?q=bio&page=1");
    expect(init.headers).toMatchObject({ "X-Staging-Key": "the-key" });
    expect(init.headers).toMatchObject({ Cookie: "PATHWAY_SESSION=abc" });
    expect(JSON.stringify(init.headers)).not.toMatch(/other=zzz|Basic/);
    expect(res.status).toBe(200);
    expect(res.headers.get("etag")).toBe('"e1"');
    expect(res.headers.get("cache-control")).toBe(
      "private, max-age=300, must-revalidate",
    );
    expect(JSON.stringify([...res.headers])).not.toContain("the-key");
    expect(res.headers.get("x-staging-key")).toBeNull();
  });

  it("revalidates with the browser's ETag and passes a 304 through", async () => {
    vi.stubEnv("API_UPSTREAM_URL", "https://api.example.com");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(null, { status: 304, headers: { etag: '"e1"' } }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const res = await call(["programs", "a--b"], "", {
      ...COOKIE,
      "if-none-match": '"e1"',
    });
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toMatchObject({
      "If-None-Match": '"e1"',
    });
    expect(res.status).toBe(304);
  });

  it("only forwards the known API areas and clean path segments", async () => {
    vi.stubEnv("API_UPSTREAM_URL", "https://api.example.com");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    for (const path of [
      ["actuator", "env"],
      ["admin"],
      ["programs", ".."],
      ["programs", "a b"],
      [],
    ]) {
      expect((await call(path)).status).toBe(404);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("turns an upstream gate rejection or outage into a clear 502 without details", async () => {
    vi.stubEnv("API_UPSTREAM_URL", "https://api.example.com");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("nope", {
          status: 401,
          headers: { "x-pathway-gate": "rejected" },
        }),
      ),
    );
    const refused = await call(["programs"], "", COOKIE);
    expect(refused.status).toBe(502);
    expect(refused.headers.get("cache-control")).toBe("no-store");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED 10.0.0.1")),
    );
    const down = await call(["programs"], "", COOKIE);
    expect(down.status).toBe(502);
    expect(await down.text()).not.toContain("10.0.0.1");
  });

  it("passes a genuine not-found from the API through, uncached", async () => {
    vi.stubEnv("API_UPSTREAM_URL", "https://api.example.com");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response('{"status":404}', {
          status: 404,
          headers: {
            "content-type": "application/json",
            "cache-control": "no-store",
          },
        }),
      ),
    );
    const res = await call(["programs", "zz--missing"], "", COOKIE);
    expect(res.status).toBe(404);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});

describe("account area", () => {
  const origin = {
    origin: "https://site.test",
    "content-type": "application/json",
  };
  function post(path: string[], headers: Record<string, string>, body = "{}") {
    return POST(
      new Request(`https://site.test/api/v1/${path.join("/")}`, {
        method: "POST",
        headers,
        body,
      }),
      { params: Promise.resolve({ path }) },
    );
  }

  it("does not ask the backend for the catalogue without a session cookie", async () => {
    vi.stubEnv("API_UPSTREAM_URL", "https://api.example.com");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    for (const area of ["programs", "universities", "discovery"]) {
      const res = await call([area], "", { cookie: "PATHWAY_SESSIONX=1" });
      expect(res.status).toBe(401);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a write from another origin or without one, and never forwards Origin", async () => {
    vi.stubEnv("API_UPSTREAM_URL", "https://api.example.com");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    expect((await post(["account", "login"], {})).status).toBe(403);
    expect(
      (await post(["account", "login"], { origin: "https://evil.test" }))
        .status,
    ).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await post(["account", "login"], origin)).status).toBe(200);
    const sent = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<
      string,
      string
    >;
    expect(Object.keys(sent).map((k) => k.toLowerCase())).not.toContain(
      "origin",
    );
  });

  it("refuses writes to the catalogue", async () => {
    vi.stubEnv("API_UPSTREAM_URL", "https://api.example.com");
    expect((await post(["programs"], origin)).status).toBe(405);
  });

  it("passes only the session cookie back and keeps account answers uncached", async () => {
    vi.stubEnv("API_UPSTREAM_URL", "https://api.example.com");
    const upstream = new Response("{}", {
      status: 200,
      headers: { "cache-control": "max-age=300" },
    });
    upstream.headers.append(
      "set-cookie",
      "PATHWAY_SESSION=tok; Path=/; HttpOnly; SameSite=Lax",
    );
    upstream.headers.append("set-cookie", "tracker=1; Path=/");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(upstream));
    const res = await post(["account", "login"], origin);
    expect(res.headers.getSetCookie()).toEqual([
      "PATHWAY_SESSION=tok; Path=/; HttpOnly; SameSite=Lax",
    ]);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});

describe("profile picture through the proxy", () => {
  const origin = { origin: "https://site.test", cookie: "PATHWAY_SESSION=abc" };
  const put = (type: string, bytes: Uint8Array) =>
    PUT(
      new Request("https://site.test/api/v1/account/avatar", {
        method: "PUT",
        headers: { ...origin, "content-type": type },
        body: bytes as unknown as BodyInit,
      }),
      { params: Promise.resolve({ path: ["account", "avatar"] }) },
    );

  it("forwards the bytes of a JPEG untouched and refuses other types before they leave the site", async () => {
    vi.stubEnv("API_UPSTREAM_URL", "https://api.example.com");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('{"present":true,"version":1}', {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
    expect((await put("image/jpeg", jpeg)).status).toBe(200);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toMatchObject({
      "Content-Type": "image/jpeg",
      Cookie: "PATHWAY_SESSION=abc",
    });
    expect(new Uint8Array(init.body as ArrayBuffer)).toEqual(jpeg);
    for (const type of [
      "text/plain",
      "image/svg+xml",
      "image/gif",
      "application/json",
    ]) {
      expect((await put(type, jpeg)).status, type).toBe(415);
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refuses a picture above the size limit", async () => {
    vi.stubEnv("API_UPSTREAM_URL", "https://api.example.com");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await put("image/jpeg", new Uint8Array(430 * 1024))).status).toBe(
      413,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("caches a versioned picture privately and never an unversioned one", async () => {
    vi.stubEnv("API_UPSTREAM_URL", "https://api.example.com");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(new Uint8Array([1, 2, 3]), {
            status: 200,
            headers: { "content-type": "image/jpeg" },
          }),
        ),
      ),
    );
    const get = (query: string) =>
      GET(
        new Request("https://site.test/api/v1/account/avatar" + query, {
          headers: origin,
        }),
        { params: Promise.resolve({ path: ["account", "avatar"] }) },
      );
    expect((await get("?v=3")).headers.get("cache-control")).toBe(
      "private, max-age=86400",
    );
    expect((await get("")).headers.get("cache-control")).toBe("no-store");
  });
});

describe("cold-start tolerance", () => {
  it("waits longer than a sleeping free-tier backend needs (84.6 s measured) and stays within the function limit", async () => {
    vi.stubEnv("API_UPSTREAM_URL", "https://api.example.com");
    const timeout = vi.spyOn(AbortSignal, "timeout");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 200 })),
    );
    await call(["programs"], "", COOKIE);
    const waited = timeout.mock.calls[0][0] as number;
    const { maxDuration } = await import("@/app/api/v1/[...path]/route");
    expect(waited).toBeGreaterThan(100_000);
    expect(maxDuration * 1000).toBeGreaterThan(waited);
    timeout.mockRestore();
  });
});

describe("same-origin base URL", () => {
  it("maps 'same-origin' to relative calls and keeps other values as origins", async () => {
    const { apiBaseUrl } = await import("@/lib/api/client");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "same-origin");
    expect(apiBaseUrl()).toBe("");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.test/");
    expect(apiBaseUrl()).toBe("https://api.test");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    expect(apiBaseUrl()).toBeNull();
  });
});
