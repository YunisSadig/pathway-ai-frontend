"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { accountApi } from "@/lib/account/api";
import { CURRENCIES, countryOptions } from "@/lib/account/countries";
import { describeError, fieldErrors } from "@/lib/account/errors";
import {
  LEVEL_LABELS,
  SEASON_LABELS,
  TARGET_LABELS,
  TEST_LABELS,
  type CurrentLevel,
  type IntakeSeason,
  type LanguageQualification,
  type LanguageTest,
  type Profile,
  type TargetLevel,
} from "@/lib/account/types";
import { useProfile } from "@/lib/account/use-profile";
import { ApiError } from "@/lib/api/client";
import { useSession } from "./session-provider";

interface FormState {
  currentCountry: string;
  currentUniversity: string;
  currentDegreeLevel: string;
  fieldOfStudy: string;
  gpa: string;
  gpaScaleMax: string;
  targetDegreeLevel: string;
  intakeSeason: string;
  intakeYear: string;
  maxAnnualTuition: string;
  maxAnnualTuitionCurrency: string;
  languages: { test: string; testName: string; overall: string }[];
  destinations: string[];
}

const EMPTY: FormState = {
  currentCountry: "",
  currentUniversity: "",
  currentDegreeLevel: "",
  fieldOfStudy: "",
  gpa: "",
  gpaScaleMax: "",
  targetDegreeLevel: "",
  intakeSeason: "",
  intakeYear: "",
  maxAnnualTuition: "",
  maxAnnualTuitionCurrency: "",
  languages: [],
  destinations: [],
};

function fromProfile(p: Profile): FormState {
  return {
    currentCountry: p.currentCountry ?? "",
    currentUniversity: p.currentUniversity ?? "",
    currentDegreeLevel: p.currentDegreeLevel ?? "",
    fieldOfStudy: p.fieldOfStudy ?? "",
    gpa: p.gpa != null ? String(p.gpa) : "",
    gpaScaleMax: p.gpaScaleMax != null ? String(p.gpaScaleMax) : "",
    targetDegreeLevel: p.targetDegreeLevel ?? "",
    intakeSeason: p.intakeSeason ?? "",
    intakeYear: p.intakeYear != null ? String(p.intakeYear) : "",
    maxAnnualTuition:
      p.maxAnnualTuition != null ? String(p.maxAnnualTuition) : "",
    maxAnnualTuitionCurrency: p.maxAnnualTuitionCurrency ?? "",
    languages: p.languageQualifications.map((q) => ({
      test: q.test,
      testName: q.testName ?? "",
      overall: String(q.overall),
    })),
    destinations: p.preferredDestinations,
  };
}

const num = (s: string): number | null => (s.trim() === "" ? null : Number(s));
const text = (s: string): string | null => (s.trim() === "" ? null : s.trim());

function toPayload(f: FormState): Partial<Profile> {
  return {
    currentCountry: text(f.currentCountry),
    currentUniversity: text(f.currentUniversity),
    currentDegreeLevel: text(f.currentDegreeLevel) as CurrentLevel | null,
    fieldOfStudy: text(f.fieldOfStudy),
    gpa: num(f.gpa),
    gpaScaleMax: num(f.gpaScaleMax),
    targetDegreeLevel: text(f.targetDegreeLevel) as TargetLevel | null,
    intakeSeason: text(f.intakeSeason) as IntakeSeason | null,
    intakeYear: num(f.intakeYear),
    maxAnnualTuition: num(f.maxAnnualTuition),
    maxAnnualTuitionCurrency: text(f.maxAnnualTuitionCurrency),
    languageQualifications: f.languages
      .filter((l) => l.test && l.overall.trim() !== "")
      .map<LanguageQualification>((l) => ({
        test: l.test as LanguageTest,
        testName: l.test === "OTHER" ? text(l.testName) : null,
        overall: Number(l.overall),
      })),
    preferredDestinations: f.destinations,
  };
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="grid gap-5 card p-6">
      <legend className="float-left mb-0 text-lg font-bold">{title}</legend>
      <div className="clear-both grid gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function ProfileForm() {
  const router = useRouter();
  const { expire } = useSession();
  const { state } = useProfile();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const countries = useMemo(() => countryOptions(), []);

  useEffect(() => {
    // fill the form once, when the saved profile has arrived
    /* eslint-disable react-hooks/set-state-in-effect */
    if (state.status === "ready" && !loaded) {
      setForm(fromProfile(state.profile));
      setLoaded(true);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [state, loaded]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setErrors({});
    setFormError(null);
    try {
      await accountApi.saveProfile(toPayload(form));
      router.replace("/profile?saved=1");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) expire();
      const fields = fieldErrors(e);
      if (Object.keys(fields).length) {
        setErrors(fields);
        setFormError("Some details need attention. They are marked below.");
      } else {
        setFormError(describeError(e));
      }
      setPending(false);
    }
  }

  if (state.status === "loading" || (state.status === "ready" && !loaded)) {
    return (
      <div
        role="status"
        aria-busy="true"
        className="h-96 animate-pulse rounded-xl bg-muted"
      >
        <span className="sr-only">Loading your profile…</span>
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <Alert kind="error" title="Your profile could not be loaded">
        {state.message}
      </Alert>
    );
  }

  const years = Array.from({ length: 8 }, (_, i) => String(2026 + i));

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      {formError ? <Alert kind="error">{formError}</Alert> : null}

      <Group title="About your studies">
        <Field
          id="currentCountry"
          label="Country where you live"
          optional
          error={errors.currentCountry}
        >
          {(p) => (
            <Select
              {...p}
              value={form.currentCountry}
              onChange={(e) => set("currentCountry", e.target.value)}
            >
              <option value="">Choose a country</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field
          id="currentUniversity"
          label="Current or previous university"
          optional
          error={errors.currentUniversity}
        >
          {(p) => (
            <Input
              {...p}
              maxLength={160}
              value={form.currentUniversity}
              onChange={(e) => set("currentUniversity", e.target.value)}
            />
          )}
        </Field>
        <Field
          id="currentDegreeLevel"
          label="Current level of study"
          optional
          error={errors.currentDegreeLevel}
        >
          {(p) => (
            <Select
              {...p}
              value={form.currentDegreeLevel}
              onChange={(e) => set("currentDegreeLevel", e.target.value)}
            >
              <option value="">Choose a level</option>
              {Object.entries(LEVEL_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field
          id="fieldOfStudy"
          label="Field of study"
          optional
          error={errors.fieldOfStudy}
        >
          {(p) => (
            <Input
              {...p}
              maxLength={120}
              value={form.fieldOfStudy}
              onChange={(e) => set("fieldOfStudy", e.target.value)}
            />
          )}
        </Field>
        <Field
          id="gpa"
          label="Your grade"
          optional
          hint="For example 3.6 out of 4.0."
          error={errors.gpa}
        >
          {(p) => (
            <Input
              {...p}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={form.gpa}
              onChange={(e) => set("gpa", e.target.value)}
            />
          )}
        </Field>
        <Field
          id="gpaScaleMax"
          label="Maximum of your grading scale"
          optional
          error={errors.gpaScaleMax}
        >
          {(p) => (
            <Input
              {...p}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={form.gpaScaleMax}
              onChange={(e) => set("gpaScaleMax", e.target.value)}
            />
          )}
        </Field>
      </Group>

      <fieldset className="grid gap-4 card p-6">
        <legend className="float-left text-lg font-bold">
          Language qualifications
        </legend>
        <div className="clear-both grid gap-4">
          {form.languages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tests added. Add the ones you have taken.
            </p>
          ) : null}
          {form.languages.map((l, i) => (
            <div
              key={i}
              className="grid gap-3 sm:grid-cols-[1.4fr_1fr_auto] sm:items-end"
            >
              <Field
                id={`test-${i}`}
                label="Test"
                error={errors[`languageQualifications[${i}]`]}
              >
                {(p) => (
                  <Select
                    {...p}
                    value={l.test}
                    onChange={(e) =>
                      set(
                        "languages",
                        form.languages.map((x, j) =>
                          j === i ? { ...x, test: e.target.value } : x,
                        ),
                      )
                    }
                  >
                    {Object.entries(TEST_LABELS).map(([v, label]) => (
                      <option key={v} value={v}>
                        {label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field id={`score-${i}`} label="Overall score">
                {(p) => (
                  <Input
                    {...p}
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min="0"
                    value={l.overall}
                    onChange={(e) =>
                      set(
                        "languages",
                        form.languages.map((x, j) =>
                          j === i ? { ...x, overall: e.target.value } : x,
                        ),
                      )
                    }
                  />
                )}
              </Field>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  set(
                    "languages",
                    form.languages.filter((_, j) => j !== i),
                  )
                }
              >
                Remove
              </Button>
              {l.test === "OTHER" ? (
                <Field
                  id={`testName-${i}`}
                  label="Name of the test"
                  className="sm:col-span-3"
                >
                  {(p) => (
                    <Input
                      {...p}
                      maxLength={60}
                      value={l.testName}
                      onChange={(e) =>
                        set(
                          "languages",
                          form.languages.map((x, j) =>
                            j === i ? { ...x, testName: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  )}
                </Field>
              ) : null}
            </div>
          ))}
          {form.languages.length < 5 ? (
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  set("languages", [
                    ...form.languages,
                    { test: "IELTS", testName: "", overall: "" },
                  ])
                }
              >
                Add a test
              </Button>
            </div>
          ) : null}
        </div>
      </fieldset>

      <Group title="Your plans">
        <Field
          id="targetDegreeLevel"
          label="Degree you are aiming for"
          optional
          error={errors.targetDegreeLevel}
        >
          {(p) => (
            <Select
              {...p}
              value={form.targetDegreeLevel}
              onChange={(e) => set("targetDegreeLevel", e.target.value)}
            >
              <option value="">Choose a degree</option>
              {Object.entries(TARGET_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field
            id="intakeSeason"
            label="Preferred intake"
            optional
            error={errors.intakeSeason}
          >
            {(p) => (
              <Select
                {...p}
                value={form.intakeSeason}
                onChange={(e) => set("intakeSeason", e.target.value)}
              >
                <option value="">Season</option>
                {Object.entries(SEASON_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field
            id="intakeYear"
            label="Year"
            optional
            error={errors.intakeYear}
          >
            {(p) => (
              <Select
                {...p}
                value={form.intakeYear}
                onChange={(e) => set("intakeYear", e.target.value)}
              >
                <option value="">Year</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <Field
          id="maxAnnualTuition"
          label="Yearly tuition budget"
          optional
          error={errors.maxAnnualTuition}
        >
          {(p) => (
            <Input
              {...p}
              type="number"
              inputMode="decimal"
              min="0"
              step="100"
              value={form.maxAnnualTuition}
              onChange={(e) => set("maxAnnualTuition", e.target.value)}
            />
          )}
        </Field>
        <Field
          id="maxAnnualTuitionCurrency"
          label="Currency"
          optional
          error={errors.maxAnnualTuitionCurrency}
        >
          {(p) => (
            <Select
              {...p}
              value={form.maxAnnualTuitionCurrency}
              onChange={(e) => set("maxAnnualTuitionCurrency", e.target.value)}
            >
              <option value="">Choose a currency</option>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </Group>

      <fieldset className="grid gap-3 card p-6">
        <legend className="float-left text-lg font-bold">
          Preferred destinations
        </legend>
        <div className="clear-both grid gap-3">
          <p className="text-sm text-muted-foreground">Up to 10 countries.</p>
          {errors.preferredDestinations ? (
            <p className="text-sm font-medium text-danger" role="alert">
              {errors.preferredDestinations}
            </p>
          ) : null}
          {form.destinations.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {form.destinations.map((code) => (
                <li key={code}>
                  <button
                    type="button"
                    onClick={() =>
                      set(
                        "destinations",
                        form.destinations.filter((c) => c !== code),
                      )
                    }
                    className="inline-flex min-h-9 items-center gap-2 rounded-full bg-primary-soft px-3 text-sm font-semibold text-primary-soft-foreground transition-colors hover:bg-selected"
                    aria-label={`Remove ${countries.find((c) => c.code === code)?.name ?? code}`}
                  >
                    {countries.find((c) => c.code === code)?.name ?? code}
                    <span aria-hidden>×</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <Field id="addDestination" label="Add a destination">
            {(p) => (
              <Select
                {...p}
                value=""
                disabled={form.destinations.length >= 10}
                onChange={(e) => {
                  const code = e.target.value;
                  if (code && !form.destinations.includes(code))
                    set("destinations", [...form.destinations, code]);
                }}
              >
                <option value="">Choose a country</option>
                {countries
                  .filter((c) => !form.destinations.includes(c.code))
                  .map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
              </Select>
            )}
          </Field>
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/profile">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
