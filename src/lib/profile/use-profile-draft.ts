"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "@/components/account/session-provider";
import { ApiError } from "@/lib/api/client";
import { hasStoredLanguage, useT } from "@/lib/i18n";
import { profileApi } from "./api";
import {
  EMPTY_PROFILE,
  type Destinations,
  type Options,
  type StudentProfile,
  type StudentProfileView,
} from "./types";
import { problemFromCode, type Problems } from "./validation";

export type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready" };

export type SaveState = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_MS = 900;

/**
 * A draft may be half-finished, but rows that are still empty are left out of the saved copy (they stay on screen): an unfinished internship
 * or exam row must not stop everything else from being saved.
 */
export function sanitize(p: StudentProfile): StudentProfile {
  const filled = (e: { organization: string; role: string }) =>
    e.organization.trim() !== "" && e.role.trim() !== "";
  return {
    ...p,
    skills: p.skills.filter(
      (s) => s.code || (s.label?.trim().length ?? 0) >= 2,
    ),
    internships: p.internships.filter(filled),
    volunteering: p.volunteering.filter(filled),
    exams: p.exams.filter(
      (e) => e.testDate !== "" && Number.isFinite(e.overall),
    ),
  };
}

/** Normalises what the API returns so every list is an array and every object exists (the form never sees undefined). */
function normalise(p: StudentProfile): StudentProfile {
  return {
    ...EMPTY_PROFILE,
    ...p,
    skills: p.skills ?? [],
    internships: p.internships ?? [],
    volunteering: p.volunteering ?? [],
    exams: (p.exams ?? []).map((e) => ({ ...e, sections: e.sections ?? [] })),
    destinations: p.destinations ?? [],
    preferredUniversities: p.preferredUniversities ?? [],
    onboarding: p.onboarding ?? EMPTY_PROFILE.onboarding,
  };
}

/**
 * The student's profile as an editable draft. Every change is saved automatically a moment later (a draft may be half-finished), a
 * failure is shown and never swallowed, and a 401 ends the session on screen. The server stays the authority on what is valid.
 */
export function useProfileDraft() {
  const { expire, setAvatar } = useSession();
  const { setLang } = useT();
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [view, setView] = useState<StudentProfileView | null>(null);
  const [draft, setDraft] = useState<StudentProfile>(EMPTY_PROFILE);
  const [options, setOptions] = useState<Options | null>(null);
  const [destinations, setDestinations] = useState<Destinations | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [serverProblems, setServerProblems] = useState<Problems>({});

  const draftRef = useRef(draft);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef<Promise<boolean> | null>(null);

  const reload = useCallback(async () => {
    setLoad({ status: "loading" });
    try {
      const [v, o, d] = await Promise.all([
        profileApi.get(),
        profileApi.options(),
        profileApi.destinations(),
      ]);
      const p = normalise(v.profile);
      draftRef.current = p;
      setView({ ...v, profile: p });
      setDraft(p);
      setOptions(o);
      setDestinations(d);
      if (p.language && !hasStoredLanguage()) setLang(p.language);
      setLoad({ status: "ready" });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) expire();
      setLoad({
        status: "error",
        message: e instanceof Error ? e.message : "",
      });
    }
  }, [expire, setLang]);

  useEffect(() => {
    // a one-time read of the server's answer
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  const flush = useCallback(async (): Promise<boolean> => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (inflight.current) await inflight.current;
    if (!dirty.current) return true;
    dirty.current = false;
    const sent = draftRef.current;
    setSaveState("saving");
    const run = (async () => {
      try {
        const v = await profileApi.save(sanitize(sent));
        setView({ ...v, profile: draftRef.current });
        setServerProblems({});
        setSaveState("saved");
        return true;
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) expire();
        if (e instanceof ApiError && e.violations.length) {
          const next: Problems = {};
          for (const v of e.violations) {
            if (!(v.field in next))
              next[v.field] = problemFromCode((v as { code?: string }).code);
          }
          setServerProblems(next);
        }
        dirty.current = true; // not stored: keep it pending
        setSaveState("error");
        return false;
      } finally {
        inflight.current = null;
      }
    })();
    inflight.current = run;
    return run;
  }, [expire]);

  const update = useCallback(
    (change: (p: StudentProfile) => StudentProfile) => {
      const next = change(draftRef.current);
      draftRef.current = next;
      dirty.current = true;
      setDraft(next);
      setSaveState("idle");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), AUTOSAVE_MS);
    },
    [flush],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const complete = useCallback(async (): Promise<
    { ok: true } | { ok: false; problems: Problems }
  > => {
    if (!(await flush())) return { ok: false, problems: {} };
    try {
      const v = await profileApi.complete();
      const p = normalise(v.profile);
      draftRef.current = p;
      setView({ ...v, profile: p });
      setDraft(p);
      return { ok: true };
    } catch (e) {
      const problems: Problems = {};
      if (e instanceof ApiError) {
        if (e.status === 401) expire();
        for (const v of e.violations)
          if (!(v.field in problems))
            problems[v.field] = problemFromCode((v as { code?: string }).code);
      }
      return { ok: false, problems };
    }
  }, [flush, expire]);

  /** Replaces the view after a change made outside the draft (picture upload). */
  const refreshAvatar = useCallback(
    (present: boolean, version: number) => {
      setView((v) => (v ? { ...v, avatar: { present, version } } : v));
      setAvatar(present, version); // the navigation reads the session, not this view
    },
    [setAvatar],
  );

  return {
    load,
    reload,
    view,
    draft,
    options,
    destinations,
    saveState,
    serverProblems,
    update,
    flush,
    complete,
    refreshAvatar,
  };
}
