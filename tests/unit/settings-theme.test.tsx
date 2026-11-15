import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import { describe, expect, it, vi } from "vitest";
import { SettingsView } from "@/components/account/settings-view";
import { LanguageProvider } from "@/lib/i18n";

vi.mock("@/components/account/session-provider", () => ({
  useSession: () => ({
    state: { status: "anonymous", serviceError: false },
    expire: vi.fn(),
    refresh: vi.fn(),
  }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

function renderSettings() {
  return render(
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="test-theme"
    >
      <LanguageProvider>
        <SettingsView />
      </LanguageProvider>
    </ThemeProvider>,
  );
}

describe("Settings for a visitor", () => {
  it("offers System, Light and Dark with System as the default", async () => {
    localStorage.clear();
    renderSettings();
    const radios = await screen.findAllByRole("radio");
    const names = radios.map((r) => r.textContent ?? "");
    expect(names.some((n) => n.startsWith("System"))).toBe(true);
    expect(names.some((n) => n.startsWith("Light"))).toBe(true);
    expect(names.some((n) => n.startsWith("Dark"))).toBe(true);
    const system = radios.find((r) =>
      (r.textContent ?? "").startsWith("System"),
    )!;
    expect(system).toHaveAttribute("aria-checked", "true");
  });

  it("remembers an explicit choice and lets the language be switched to Russian", async () => {
    localStorage.clear();
    renderSettings();
    fireEvent.click(
      (await screen.findAllByRole("radio")).find((r) =>
        (r.textContent ?? "").startsWith("Dark"),
      )!,
    );
    expect(localStorage.getItem("test-theme")).toBe("dark");
    fireEvent.click(
      screen.getAllByRole("radio").find((r) => r.textContent === "Русский")!,
    );
    expect(localStorage.getItem("pathway-lang")).toBe("ru");
    expect(await screen.findByText("Внешний вид")).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("ru");
  });

  it("tells a visitor that account settings need a login, instead of showing them", async () => {
    localStorage.clear();
    renderSettings();
    expect(
      await screen.findByText("More settings after you log in"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Delete your account")).not.toBeInTheDocument();
  });
});
