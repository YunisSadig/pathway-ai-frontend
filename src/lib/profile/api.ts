import { apiGet, apiSend, apiUpload } from "@/lib/api/client";
import type {
  Destinations,
  Options,
  StudentProfile,
  StudentProfileView,
} from "./types";

const BASE = "/api/v1/account";

/** Typed calls to the student profile API. Same-origin through the site's proxy; no token is handled here. */
export const profileApi = {
  options: () => apiGet<Options>(`${BASE}/options`),
  destinations: () => apiGet<Destinations>(`${BASE}/options/destinations`),
  get: () => apiGet<StudentProfileView>(`${BASE}/student-profile`),
  save: (profile: StudentProfile) =>
    apiSend<StudentProfileView>("PUT", `${BASE}/student-profile`, profile),
  complete: () =>
    apiSend<StudentProfileView>("POST", `${BASE}/student-profile/complete`),
  setLanguage: (language: "en" | "ru") =>
    apiSend("PUT", `${BASE}/language`, { language }),
  uploadAvatar: (jpeg: Blob) =>
    apiUpload<{ present: boolean; version: number }>(
      `${BASE}/avatar`,
      jpeg,
      "image/jpeg",
    ),
  removeAvatar: () => apiSend("DELETE", `${BASE}/avatar`),
};

/** The picture is private to its owner and cached by the browser per version (the version changes on every upload). */
export function avatarUrl(version: number): string {
  return `${BASE}/avatar?v=${version}`;
}
