import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "@/lib/i18n";
import {
  UniversityInformation,
  UniversitySourceChecks,
} from "@/components/programs/university-information";
import type { UniversityFact } from "@/types/program";

const fact: UniversityFact = {
  field: "tuition_scope",
  scope: "",
  value: "10000 EUR per year for non-EU/EEA students; exemptions apply",
  applicationCycle: null,
  temporalStatus: "UNKNOWN_YEAR",
  verificationStatus: "VERIFIED",
  lastSuccessfulCheck: "2026-11-15T11:00:00Z",
  source: {
    url: "https://example.test/synthetic-fees",
    title: "Synthetic fees source",
    publisher: "Synthetic University",
    type: "UNIVERSITY_WEBSITE",
    retrievedOn: "2026-11-15",
  },
};

describe("university information", () => {
  it("preserves the applicant scope and distinguishes verified extraction from an unknown fee period", () => {
    render(
      <LanguageProvider>
        <UniversityInformation facts={[fact]} fields={["tuition_scope"]} />
      </LanguageProvider>,
    );
    expect(
      screen.getByText(/10000 EUR per year for non-EU\/EEA/),
    ).toBeVisible();
    expect(screen.getByText("Period not stated")).toBeVisible();
    expect(screen.getByText(/does not state a verified period/)).toBeVisible();
    expect(screen.queryByText("Current")).not.toBeInTheDocument();
    expect(screen.getByText(/Last successful source check/)).toHaveTextContent(
      "November 15, 2026",
    );
  });

  it("marks a changed source as pending review while retaining its previous value", () => {
    render(
      <LanguageProvider>
        <UniversityInformation
          facts={[{ ...fact, verificationStatus: "PENDING_REVIEW" }]}
          fields={["tuition_scope"]}
        />
      </LanguageProvider>,
    );
    expect(screen.getByText("Change awaiting review")).toBeVisible();
    expect(screen.getByText(/previously recorded information/)).toBeVisible();
    expect(screen.getByText(/10000 EUR/)).toBeVisible();
  });

  it("keeps historical deadlines historical and missing fact groups absent", () => {
    const { rerender } = render(
      <LanguageProvider>
        <UniversityInformation
          facts={[
            {
              ...fact,
              field: "application_period",
              value: "1 Jan 2000 – 15 Jan 2000",
              temporalStatus: "HISTORICAL",
            },
          ]}
          fields={["application_period"]}
        />
      </LanguageProvider>,
    );
    expect(screen.getByText("Outdated")).toBeVisible();
    expect(screen.queryByText("Current")).not.toBeInTheDocument();
    rerender(
      <LanguageProvider>
        <UniversityInformation facts={[]} fields={["tuition_scope"]} />
      </LanguageProvider>,
    );
    expect(screen.queryByText(/Tuition/)).not.toBeInTheDocument();
  });

  it("explains separate university checks and exposes source outages without borrowing offering freshness", () => {
    render(
      <LanguageProvider>
        <UniversitySourceChecks
          sources={[
            {
              url: fact.source.url,
              publisher: "Synthetic University",
              status: "FAILING",
              lastAttemptAt: "2026-11-16T11:00:00Z",
              lastSuccessAt: "2026-11-01T11:00:00Z",
              nextCheckAt: null,
              method: "university-program",
            },
          ]}
        />
      </LanguageProvider>,
    );
    expect(
      screen.getByText(/does not verify fees or admissions/),
    ).toBeInTheDocument();
    expect(screen.getByText("Source needs rechecking")).toBeInTheDocument();
    expect(screen.getByText(/Last successful source check/)).toHaveTextContent(
      "November 1, 2026",
    );
  });
});

describe("one fact, one source", () => {
  const credits = (scope: string, value: string): UniversityFact => ({
    ...fact,
    field: "credits",
    scope,
    value,
    temporalStatus: "UNKNOWN_YEAR",
  });

  it("shows the university page's value and not the national record's duplicate", () => {
    render(
      <LanguageProvider>
        <UniversityInformation
          facts={[
            credits("", "180+120 ECTS"),
            credits("studyinfo", "300 ECTS"),
          ]}
          fields={["credits"]}
        />
      </LanguageProvider>,
    );
    expect(screen.getByText("180+120 ECTS")).toBeVisible();
    expect(screen.queryByText("300 ECTS")).not.toBeInTheDocument();
  });

  it("uses the national record when the university page does not state the field", () => {
    render(
      <LanguageProvider>
        <UniversityInformation
          facts={[credits("studyinfo", "180 ECTS")]}
          fields={["credits"]}
        />
      </LanguageProvider>,
    );
    expect(screen.getByText("180 ECTS")).toBeVisible();
  });
});
