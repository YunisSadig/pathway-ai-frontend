import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignupForm } from "@/components/account/signup-form";
import { LanguageProvider } from "@/lib/i18n";

const ACCOUNT = {
  id: "a1",
  email: "student@example.test",
  displayName: null,
  role: "USER",
  emailVerified: false,
  catalogueAccess: false,
  createdAt: "2000-01-01T00:00:00Z",
};
const router = { replace: vi.fn(), push: vi.fn() };
const session = {
  state: { status: "anonymous", serviceError: false },
  signIn: vi.fn(),
};
const register = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/components/account/session-provider", () => ({
  useSession: () => session,
  safeNext: (n: string | null) => (n && n.startsWith("/") ? n : "/dashboard"),
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
  accountApi: { register: (...args: unknown[]) => register(...args) },
}));

const form = () => document.querySelector("form")!;
function fill(email: string, agreed = true) {
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText("Password", { exact: true }), {
    target: { value: "correct horse battery 7" },
  });
  if (agreed) fireEvent.click(screen.getByLabelText(/I have read the/));
}

beforeEach(() => {
  localStorage.clear();
  router.replace.mockReset();
  session.signIn = vi.fn();
  register.mockReset();
});

describe("sign up", () => {
  it("accepts ordinary addresses, including ones with the letters s and dots", async () => {
    register.mockResolvedValue({
      status: "CREATED",
      message: "",
      account: ACCOUNT,
    });
    for (const email of [
      "student@example.test",
      "first.last+tag@mail.example.org",
      "s@s.ss",
    ]) {
      register.mockClear();
      const view = render(
        <LanguageProvider>
          <SignupForm />
        </LanguageProvider>,
      );
      fill(email);
      await act(async () => fireEvent.submit(form()));
      expect(register, email).toHaveBeenCalledTimes(1);
      view.unmount();
    }
  });

  it("rejects an address without a domain or with spaces", async () => {
    render(
      <LanguageProvider>
        <SignupForm />
      </LanguageProvider>,
    );
    for (const email of [
      "student",
      "student@",
      "student@example",
      "stu dent@example.test",
    ]) {
      fill(email);
      await act(async () => fireEvent.submit(form()));
      expect(
        screen.getByText("Enter a valid email address."),
        email,
      ).toBeInTheDocument();
    }
    expect(register).not.toHaveBeenCalled();
  });

  it("signs in from the response, forgets the password, and registers only once on a double submit", async () => {
    let finish: (v: unknown) => void = () => {};
    register.mockImplementation(
      () => new Promise((resolve) => (finish = resolve)),
    );
    render(
      <LanguageProvider>
        <SignupForm />
      </LanguageProvider>,
    );
    fill("student@example.test");
    await act(async () => {
      fireEvent.submit(form());
      fireEvent.submit(form());
    });
    expect(register).toHaveBeenCalledTimes(1);
    await act(async () =>
      finish({ status: "CREATED", message: "", account: ACCOUNT }),
    );
    expect(session.signIn).toHaveBeenCalledWith(ACCOUNT);
    expect(router.replace).toHaveBeenCalledWith("/dashboard?welcome=1");
    expect(
      (screen.getByLabelText("Password", { exact: true }) as HTMLInputElement)
        .value,
    ).toBe("");
    expect(
      screen.getByRole("button", { name: "Create your account" }),
    ).toBeEnabled();
  });
});
