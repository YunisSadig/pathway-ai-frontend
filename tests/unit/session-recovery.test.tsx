import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  RETRY_DELAYS_MS,
  SessionProvider,
  useSession,
} from "@/components/account/session-provider";
import { ApiError } from "@/lib/api/client";

const me = vi.fn();
vi.mock("@/lib/account/api", () => ({
  accountApi: { me: () => me(), logout: vi.fn() },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

function Probe() {
  const { state } = useSession();
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
