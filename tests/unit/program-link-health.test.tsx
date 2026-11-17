import { render as renderComponent, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { degreeLabelKey } from "@/components/programs/degree-pathway";
import { ProgramDestinations } from "@/components/programs/program-destinations";
import { LanguageProvider } from "@/lib/i18n";

const render = (children: ReactNode) =>
  renderComponent(<LanguageProvider>{children}</LanguageProvider>);

const links = {
  officialProgramUrl: "https://example.test/program/synthetic",
  officialAdmissionsUrl: "https://example.test/admissions/synthetic",
};

describe("official link health", () => {
  it.each(["BROKEN", "STALE", "PENDING_REVIEW"] as const)(
    "a %s program page is never the primary 'View official university program' button",
    (status) => {
      render(<ProgramDestinations {...links} programLinkStatus={status} />);
      expect(
        screen.queryByRole("link", {
          name: /View official university program/,
        }),
      ).toBeNull();
      expect(screen.getByRole("status")).toHaveTextContent(/did not pass/);
      expect(
        screen.getByRole("link", { name: /Last known university page/ }),
      ).toHaveAttribute("href", links.officialProgramUrl);
    },
  );

  it.each([
    "VERIFIED",
    "REDIRECTED_VERIFIED",
    "REPLACEMENT_VERIFIED",
    "SOURCE_UNAVAILABLE",
  ] as const)(
    "a %s program page keeps the primary button (a temporary block is not a broken page)",
    (status) => {
      render(<ProgramDestinations {...links} programLinkStatus={status} />);
      expect(
        screen.getByRole("link", {
          name: /View official university program/,
        }),
      ).toHaveAttribute("href", links.officialProgramUrl);
      expect(screen.queryByRole("status")).toBeNull();
    },
  );
});

describe("degree pathway labels", () => {
  it("never calls a combined 3+2 pathway a standalone bachelor's degree", () => {
    expect(degreeLabelKey("BACHELOR", "BACHELOR_AND_MASTER")).toBe(
      "unifact.pathwayCombined",
    );
    expect(degreeLabelKey("BACHELOR", "SINGLE_DEGREE")).toBe(
      "unifact.pathwayBachelor",
    );
    expect(degreeLabelKey("BACHELOR", null)).toBe("unifact.bachelorEntry");
    expect(degreeLabelKey("MASTER", "SINGLE_DEGREE")).toBe("unifact.master");
  });
});
