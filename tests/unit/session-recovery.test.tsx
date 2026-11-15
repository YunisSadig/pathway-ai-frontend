import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  RETRY_DELAYS_MS,
  SessionProvider,
  useSession,
} from "@/components/account/session-provider";
import { ApiError } from "@/lib/api/client";

const me = vi.fn();
const logout = vi.fn();
vi.mock("@/lib/account/api", () => ({
  accountApi: { me: () => me(), logout: () => logout() },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

let controls: ReturnType<typeof useSession> | null = null;

function Probe() {
  const session = useSession();
  controls = session;
  const { state } = session;
  return (
    <p data-testid="s">
      {state.status === "authenticated"
        ? `in:${state.user.email}`
        : state.status === "anonymous"
          ? `anon:${state.serviceError ? "unreachable" : "signed-out"}`
          : "loading"}
    </p>
  );
}

const account = {
  id: "1",
  email: "a@example.test",
  displayName: null,
  role: "USER",
  emailVerified: false,
  catalogueAccess: false,
  createdAt: "2000-01-01T00:00:00Z",
};

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("session restoration while the API is asleep", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    me.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it("recovers by itself when the API wakes up instead of staying logged out", async () => {
    me.mockRejectedValueOnce(new ApiError(0, "unreachable"));
    me.mockResolvedValue(account);
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    await flush();
    expect(screen.getByTestId("s").textContent).toBe("anon:unreachable");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(RETRY_DELAYS_MS[0] + 10);
    });
    expect(screen.getByTestId("s").textContent).toBe("in:a@example.test");
    expect(me).toHaveBeenCalledTimes(2);
  });

  it("a real sign-out (401) is final and is never retried", async () => {
    me.mockRejectedValue(new ApiError(401, "no session"));
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    await flush();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });
    expect(screen.getByTestId("s").textContent).toBe("anon:signed-out");
    expect(me).toHaveBeenCalledTimes(1);
  });

  it("stops after the last pause so a dead API is not polled forever", async () => {
    me.mockRejectedValue(new ApiError(0, "unreachable"));
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    await flush();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600_000);
    });
    expect(me).toHaveBeenCalledTimes(1 + RETRY_DELAYS_MS.length);
  });
});

describe("a late answer never overrides a newer state", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    me.mockReset();
    logout.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it("a slow 401 for the old state does not undo a login that happened meanwhile", async () => {
    let answer: (e: unknown) => void = () => {};
    me.mockImplementationOnce(
      () => new Promise((_, reject) => (answer = reject)),
    );
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    await flush();
    act(() => controls!.signIn(account as never)); // the person logged in while the first question was still open
    expect(screen.getByTestId("s").textContent).toBe("in:a@example.test");
    await act(async () => {
      answer(new ApiError(401, "no session"));
      await Promise.resolve();
    });
    expect(screen.getByTestId("s").textContent).toBe("in:a@example.test");
  });

  it("an answer that arrives after log out does not bring the session back", async () => {
    let answer: (v: unknown) => void = () => {};
    me.mockImplementationOnce(
      () => new Promise((resolve) => (answer = resolve)),
    );
    logout.mockResolvedValue(undefined);
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    await flush();
    await act(async () => {
      await controls!.logout();
    });
    expect(screen.getByTestId("s").textContent).toBe("anon:signed-out");
    await act(async () => {
      answer(account);
      await Promise.resolve();
    });
    expect(screen.getByTestId("s").textContent).toBe("anon:signed-out");
  });

  it("coming back online while the API is still down keeps the retry chain going", async () => {
    me.mockRejectedValue(new ApiError(0, "unreachable"));
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    await flush();
    await act(async () => {
      window.dispatchEvent(new Event("online"));
      await Promise.resolve();
    });
    const afterOnline = me.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600_000);
    });
    expect(me.mock.calls.length).toBeGreaterThan(afterOnline + 1);
  });
});
