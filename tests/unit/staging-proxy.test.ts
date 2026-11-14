import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/v1/[...path]/route";
import { evaluateAccess } from "@/proxy";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const basic = (value: string) => `Basic ${btoa(value)}`;

describe("evaluateAccess", () => {
  it("is open for a deliberate public launch and in development", () => {
    expect(
      evaluateAccess(null, { PUBLIC_LAUNCH: "true", NODE_ENV: "production" }),
    ).toBe("allow");
    expect(evaluateAccess(null, { NODE_ENV: "development" })).toBe("allow");
  });

  it("fails closed in production when nothing is configured", () => {
    expect(evaluateAccess(null, { NODE_ENV: "production" })).toBe(
      "unconfigured",
    );
    expect(
      evaluateAccess(null, { PUBLIC_LAUNCH: "yes", NODE_ENV: "production" }),
    ).toBe("unconfigured");
  });

  it("challenges everything except the exact credentials", () => {
    const env = { SITE_BASIC_AUTH: "staff:s3cret", NODE_ENV: "production" };
    expect(evaluateAccess(null, env)).toBe("challenge");
    expect(evaluateAccess("Bearer abc", env)).toBe("challenge");
    expect(evaluateAccess("Basic !!!notbase64", env)).toBe("challenge");
    expect(evaluateAccess(basic("staff:wrong"), env)).toBe("challenge");
    expect(evaluateAccess(basic("staff:s3cret "), env)).toBe("challenge");
    expect(evaluateAccess(basic("staff:s3cret"), env)).toBe("allow");
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
      cookie: "session=abc",
      authorization: "Basic eDp5",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example.com/api/v1/programs?q=bio&page=1");
    expect(init.headers).toMatchObject({ "X-Staging-Key": "the-key" });
    expect(JSON.stringify(init.headers)).not.toMatch(/session=abc|Basic/);
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
      vi.fn().mockResolvedValue(new Response("nope", { status: 401 })),
    );
    const refused = await call(["programs"]);
    expect(refused.status).toBe(502);
    expect(refused.headers.get("cache-control")).toBe("no-store");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED 10.0.0.1")),
    );
    const down = await call(["programs"]);
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
    const res = await call(["programs", "zz--missing"]);
    expect(res.status).toBe(404);
    expect(res.headers.get("cache-control")).toBe("no-store");
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
    await call(["programs"]);
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
