"use client";

import { useMemo, useState } from "react";
import { useSession } from "@/components/account/session-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { accountApi } from "@/lib/account/api";
import { countryName, useT } from "@/lib/i18n";
import { AvatarUploader } from "./avatar-uploader";
import { SectionCard, useProblemText, type StepProps } from "./shared";

/** Step 1: who the student is. Citizenship and residence are different questions and are never inferred from each other. */
export function BackgroundStep({
  draft,
  update,
  options,
  problems,
  avatar,
  onAvatar,
}: StepProps & {
  avatar: { present: boolean; version: number };
  onAvatar: (present: boolean, version: number) => void;
}) {
  const { t, lang } = useT();
  const { state, refresh } = useSession();
  const err = useProblemText(problems);
  const user = state.status === "authenticated" ? state.user : null;
  const [name, setName] = useState(user?.displayName ?? "");
  const [nameError, setNameError] = useState(false);
  const [unsupported, setUnsupported] = useState<
    "citizenship" | "residence" | null
  >(null);

  const countries = useMemo(
    () =>
      options.countries
        .map((c) => ({
          value: c.code,
          label: countryName(c.code, lang),
          keywords: c.code,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, lang)),
    [options.countries, lang],
  );

  async function saveName() {
    const next = name.trim();
    if (next === (user?.displayName ?? "")) return;
    setNameError(false);
    try {
      await accountApi.updateDisplayName(next);
      await refresh();
    } catch {
      setNameError(true);
    }
  }

  const countryField = (
    field: "citizenship" | "residence",
    label: string,
    hint: string,
  ) => (
    <div className="grid gap-2">
      <Field id={field} label={label} hint={hint} error={err(field)}>
        {(p) => (
          <Combobox
            {...p}
            options={countries}
            value={draft[field]}
            placeholder={t("bg.countryPlaceholder")}
            emptyText={t("common.noMatches")}
            onChange={(code) => {
              setUnsupported((u) => (u === field ? null : u));
              update((d) => ({ ...d, [field]: code }));
            }}
          />
        )}
      </Field>
      <Button
        type="button"
        variant="link"
        size="link"
        className="justify-start"
        onClick={() => {
          update((d) => ({ ...d, [field]: null }));
          setUnsupported(field);
        }}
      >
        {t("bg.notListed")}
      </Button>
      {unsupported === field ? (
        <Alert kind="info" title={t("bg.unsupportedTitle")}>
          {t("bg.unsupportedBody")}
        </Alert>
      ) : null}
    </div>
  );

  return (
    <div className="grid gap-6">
      <SectionCard title={t("bg.aboutYou")} description={t("bg.aboutYouHelp")}>
        <AvatarUploader
          present={avatar.present}
          version={avatar.version}
          name={user?.displayName ?? undefined}
          onChanged={onAvatar}
        />
        <Field
          id="displayName"
          label={t("bg.name")}
          optional
          hint={t("bg.nameHint")}
          error={nameError ? t("bg.nameError") : null}
        >
          {(p) => (
            <Input
              {...p}
              maxLength={80}
              autoComplete="given-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
            />
          )}
        </Field>
      </SectionCard>

      <SectionCard
        title={t("bg.countries")}
        description={t("bg.countriesHelp")}
      >
        {countryField(
          "citizenship",
          t("bg.citizenship"),
          t("bg.citizenshipHint"),
        )}
        {countryField("residence", t("bg.residence"), t("bg.residenceHint"))}
      </SectionCard>
    </div>
  );
}
