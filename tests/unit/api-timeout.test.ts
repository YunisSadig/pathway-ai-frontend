import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiGet, apiSend, apiTimeoutMs } from "@/lib/api/client";

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "same-origin");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

/** A fetch that never answers on its own but honours the abort signal, like a real one. */
function hangingFetch() {
  return vi.fn(
    (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        );
      }),
  );
}

describe("bounded API calls", () => {
  it("the default wait covers a cold start of the sleeping backend (measured up to about 109 s) and is still finite", () => {
    expect(apiTimeoutMs()).toBeGreaterThan(130_000); // the proxy itself waits up to 130 s
    expect(apiTimeoutMs()).toBeLessThanOrEqual(150_000); // the function limit of the platform
  });

  it("a request that never answers ends with a TIMEOUT error instead of waiting for ever", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_TIMEOUT_MS", "5000");
    vi.stubGlobal("fetch", hangingFetch());
    const pending = apiSend("POST", "/api/v1/account/login", {
      email: "a@b.c",
      password: "x",
    }).catch((e) => e);
    await vi.advanceTimersByTimeAsync(4999);
    let settled = false;
    void pending.then(() => (settled = true));
    await Promise.resolve();
    expect(settled).toBe(false); // not yet
    await vi.advanceTimersByTimeAsync(2);
    const error = await pending;
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 0, code: "TIMEOUT" });
  });

  it("the same bound applies to reads (the session check can no longer hang the page)", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_TIMEOUT_MS", "3000");
    vi.stubGlobal("fetch", hangingFetch());
    const pending = apiGet("/api/v1/account/me").catch((e) => e);
    await vi.advanceTimersByTimeAsync(3100);
    expect(await pending).toMatchObject({ status: 0, code: "TIMEOUT" });
  });

  it("a slow but real answer inside the limit is delivered (a cold start must not fail)", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_TIMEOUT_MS", "60000");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) =>
            setTimeout(
              () =>
                resolve(
                  new Response('{"id":"a1"}', {
                    status: 200,
                    headers: { "content-type": "application/json" },
                  }),
                ),
              45_000,
            ),
          ),
      ),
    );
    const pending = apiSend<{ id: string }>("POST", "/api/v1/account/login", {
      email: "a@b.c",
      password: "x",
    });
    await vi.advanceTimersByTimeAsync(45_001);
    expect(await pending).toEqual({ id: "a1" });
  });

  it("a caller's own abort is still an abort, not a timeout", async () => {
    vi.stubGlobal("fetch", hangingFetch());
    const controller = new AbortController();
    const pending = apiGet("/api/v1/account/me", undefined, {
      signal: controller.signal,
    }).catch((e) => e);
    controller.abort();
    const error = await pending;
    expect(error).toBeInstanceOf(DOMException);
    expect((error as DOMException).name).toBe("AbortError");
  });

  it("a rejected network call is not mistaken for a timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
    const error = await apiSend("POST", "/api/v1/account/login", {}).catch(
      (e) => e,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBeUndefined();
    expect(error.status).toBe(0);
  });
});
