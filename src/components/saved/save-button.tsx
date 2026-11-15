"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useState } from "react";
import { useSession } from "@/components/account/session-provider";
import { Button } from "@/components/ui/button";
import { useErrorText } from "@/lib/account/errors";
import { useT } from "@/lib/i18n";
import { SavePrompt } from "./save-prompt";
import { useSaved } from "./saved-provider";

/** Save or unsave a program or a university. Visitors are invited to log in; a failure is shown, never swallowed. */
export function SaveButton({
  kind,
  id,
}: {
  kind: "program" | "university";
  id: string;
}) {
  const { t } = useT();
  const { describe } = useErrorText();
  const { state } = useSession();
  const saved = useSaved();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (state.status === "loading") {
    return (
      <div aria-hidden className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
    );
  }
  if (state.status === "anonymous") return <SavePrompt />;

  const isSaved =
    kind === "program" ? saved.isProgramSaved(id) : saved.isUniversitySaved(id);
  async function toggle() {
    setPending(true);
    setError(null);
    try {
      await (kind === "program"
        ? saved.toggleProgram(id)
        : saved.toggleUniversity(id));
    } catch (e) {
      setError(describe(e));
    } finally {
      setPending(false);
    }
  }

  const Icon = isSaved ? BookmarkCheck : Bookmark;
  return (
    <div className="grid gap-1.5">
      <Button
        type="button"
        variant={isSaved ? "primary" : "outline"}
        size="sm"
        aria-pressed={isSaved}
        disabled={pending || !saved.ready}
        onClick={toggle}
      >
        <Icon aria-hidden /> {isSaved ? t("save.saved") : t("save.save")}
      </Button>
      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
