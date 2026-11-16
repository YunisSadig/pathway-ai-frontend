import { render as renderComponent, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ProgramDestinations } from "@/components/programs/program-destinations";
import { LanguageProvider } from "@/lib/i18n";

const render = (children: ReactNode) =>
  renderComponent(<LanguageProvider>{children}</LanguageProvider>);

const links = {
  officialProgramUrl: "https://example.test/program/synthetic",
  officialAdmissionsUrl: "https://example.test/admissions/synthetic",
};

describe("program destinations", () => {
  it("puts the university information first even when an application is verified", () => {
    render(
      <ProgramDestinations
        {...links}
        officialApplicationUrl="https://opintopolku.fi/synthetic-application"
      />,
    );
    const anchors = screen.getAllByRole("link");
    expect(anchors[0]).toHaveTextContent("View official university program");
    expect(anchors[0]).toHaveAttribute("href", links.officialProgramUrl);
    expect(anchors[1]).toHaveTextContent("Official admissions information");
    expect(anchors[2]).toHaveTextContent("Apply on the official page");
    expect(screen.getByText(/national application portal/)).toBeVisible();
    for (const anchor of anchors) {
      expect(anchor).toHaveAttribute("target", "_blank");
      expect(anchor).toHaveAttribute("rel", "noopener noreferrer");
      expect(anchor).toHaveAccessibleName(/opens in a new tab/);
    }
  });

  it("never substitutes a Studyinfo source URL for a university program destination", () => {
    render(
      <ProgramDestinations
        officialProgramUrl="https://opintopolku.fi/konfo/en/koulutus/synthetic"
        officialAdmissionsUrl={null}
      />,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText(/university-owned program page/)).toBeVisible();
    expect(screen.getByText(/no verified application link/i)).toBeVisible();
  });

  it("rejects invalid URLs and does not turn admissions information into Apply", () => {
    render(
      <ProgramDestinations
        officialProgramUrl="javascript:alert(1)"
        officialAdmissionsUrl={links.officialAdmissionsUrl}
        officialApplicationUrl="https://user:password@example.test/form"
      />,
    );
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.queryByRole("link", { name: /Apply/ })).toBeNull();
  });

  it("keeps public detail informational without showing protected application state", () => {
    render(<ProgramDestinations {...links} showApplicationStatus={false} />);
    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.queryByText(/current cycle/)).toBeNull();
  });
});
