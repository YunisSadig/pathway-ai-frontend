import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/components/account/login-form";
import { ApiError } from "@/lib/api/client";
import { LanguageProvider } from "@/lib/i18n";

const ACCOUNT = {
  id: "a1",
  email: "s@example.test",
  displayName: null,
  role: "USER",
  emailVerified: false,
  catalogueAccess: false,
  createdAt: "2000-01-01T00:00:00Z",
};

const router = { replace: vi.fn(), push: vi.fn() };
let query = new URLSearchParams();
const session: { state: unknown; signIn: ReturnType<typeof vi.fn> } = {
  state: { status: "anonymous", serviceError: false },
  signIn: vi.fn(),
};
const login = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => query,
}));
vi.mock("@/components/account/session-provider", () => ({
  useSession: () => session,
  safeNext: (n: string | null) =>
    n && n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard",
}));
vi.mock("@/lib/account/use-account-config", () => ({
  useAccountConfig: () => ({
    config: {
      registrationOpen: true,
      emailDeliveryAvailable: false,
      cataloguePublic: false,
    },
    failed: false,
  }),
}));
vi.mock("@/lib/account/api", () => ({
  accountApi: { login: (...args: unknown[]) => login(...args) },
}));

function mount() {
  return render(
    <LanguageProvider>
      <LoginForm />
    </LanguageProvider>,
  );
}
const submit = () =>
  document.querySelector("form button[type=submit]") as HTMLButtonElement;
const fill = (
  email = "s@example.test",
  password = "correct horse battery 7",
) => {
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: password },
  });
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  localStorage.clear();
  router.replace.mockReset();
  login.mockReset();
  session.signIn = vi.fn();
  session.state = { status: "anonymous", serviceError: false };
  query = new URLSearchParams();
  vi.stubEnv("NEXT_PUBLIC_API_TIMEOUT_MS", "");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("log in never leaves the button on 'Logging in…'", () => {
  it("success: the session comes from the response, the router moves on, the password is forgotten and the form is usable again", async () => {
    login.mockResolvedValue(ACCOUNT);
    const view = mount();
    fill();
    await act(async () => {
      fireEvent.submit(submit().closest("form")!);
    });
    expect(login).toHaveBeenCalledWith({
      email: "s@example.test",
      password: "correct horse battery 7",
    });
    expect(session.signIn).toHaveBeenCalledWith(ACCOUNT);
    expect(router.replace).toHaveBeenCalledWith("/dashboard");
    expect((screen.getByLabelText("Password") as HTMLInputElement).value).toBe(
      "",
    ); // not kept in memory
    // the situation that was reported: the router keeps this page mounted, the person logs out and comes back to it
    session.state = {
      status: "anonymous",
      serviceError: false,
      loggedOut: true,
    };
    view.rerender(
      <LanguageProvider>
        <LoginForm />
      </LanguageProvider>,
    );
    expect(submit()).toBeEnabled();
    expect(submit()).toHaveTextContent("Log in");
    expect(screen.queryByText("Logging in…")).not.toBeInTheDocument();
  });

  it("honours a safe 'next' target", async () => {
    login.mockResolvedValue(ACCOUNT);
    query = new URLSearchParams("next=%2Fprofile%2Fedit%3Fstep%3D3");
    mount();
    fill();
    await act(async () => fireEvent.submit(submit().closest("form")!));
    expect(router.replace).toHaveBeenCalledWith("/profile/edit?step=3");
  });

  it("ignores an unsafe 'next' target (no open redirect)", async () => {
    login.mockResolvedValue(ACCOUNT);
    query = new URLSearchParams("next=https%3A%2F%2Fevil.test");
    mount();
    fill();
    await act(async () => fireEvent.submit(submit().closest("form")!));
    expect(router.replace).toHaveBeenCalledWith("/dashboard");
  });

  it("ignores a second submit while the first is running (double click, repeated Enter)", async () => {
    let finish: (a: typeof ACCOUNT) => void = () => {};
    login.mockImplementation(
      () => new Promise((resolve) => (finish = resolve)),
    );
    mount();
    fill();
    const form = submit().closest("form")!;
    await act(async () => {
      fireEvent.submit(form);
      fireEvent.submit(form);
      fireEvent.submit(form);
    });
    expect(login).toHaveBeenCalledTimes(1);
    expect(submit()).toBeDisabled();
    expect(submit()).toHaveTextContent("Logging in…");
    await act(async () => finish(ACCOUNT));
    expect(login).toHaveBeenCalledTimes(1);
  });

  it("an error ends the busy state and explains itself", async () => {
    login.mockRejectedValue(new ApiError(401, "x", "INVALID_CREDENTIALS"));
    mount();
    fill();
    await act(async () => fireEvent.submit(submit().closest("form")!));
    expect(screen.getByText("Invalid email or password.")).toBeInTheDocument();
    expect(submit()).toBeEnabled();
    // and the next attempt works
    login.mockResolvedValue(ACCOUNT);
    await act(async () => fireEvent.submit(submit().closest("form")!));
    expect(session.signIn).toHaveBeenCalledWith(ACCOUNT);
  });

  it("a timeout ends the busy state with a clear message", async () => {
    login.mockRejectedValue(new ApiError(0, "took too long", "TIMEOUT"));
    mount();
    fill();
    await act(async () => fireEvent.submit(submit().closest("form")!));
    expect(screen.getByText(/taking too long to answer/)).toBeInTheDocument();
    expect(submit()).toBeEnabled();
  });

  it("a slow answer shows progress messages, then succeeds without failing", async () => {
    let finish: (a: typeof ACCOUNT) => void = () => {};
    login.mockImplementation(
      () => new Promise((resolve) => (finish = resolve)),
    );
    mount();
    fill();
    await act(async () => fireEvent.submit(submit().closest("form")!));
    expect(screen.queryByText(/waking up/)).not.toBeInTheDocument();
    await act(async () => vi.advanceTimersByTime(5000));
    expect(
      screen.getByText(/may be waking up after a quiet period/),
    ).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTime(30_000));
    expect(
      screen.getByText(/Still waiting for the service to wake up/),
    ).toBeInTheDocument();
    expect(submit()).toBeDisabled(); // still one request, no duplicate
    await act(async () => finish(ACCOUNT)); // a cold start that takes 35 s is not a failure
    expect(session.signIn).toHaveBeenCalledWith(ACCOUNT);
    expect(screen.queryByText(/waking up/)).not.toBeInTheDocument();
  });

  it("if the router does not leave the login page, a full navigation takes over", async () => {
    login.mockResolvedValue(ACCOUNT);
    const assign = vi.fn();
    vi.stubGlobal("location", {
      pathname: "/login",
      origin: "https://site.test",
      assign,
      href: "https://site.test/login",
    });
    mount();
    fill();
    await act(async () => fireEvent.submit(submit().closest("form")!));
    expect(assign).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(4100));
    expect(assign).toHaveBeenCalledWith("/dashboard");
  });

  it("someone who is already signed in is sent on instead of being shown a form", () => {
    session.state = { status: "authenticated", user: ACCOUNT };
    query = new URLSearchParams("next=%2Fsaved");
    mount();
    expect(router.replace).toHaveBeenCalledWith("/saved");
    expect(submit()).toBeDisabled();
    expect(submit()).toHaveTextContent("Taking you to your dashboard…");
  });
});
