import { apiGet, apiSend } from "@/lib/api/client";
import type {
  Account,
  AccountConfig,
  Profile,
  RegisterResponse,
  SavedItems,
} from "./types";

const BASE = "/api/v1/account";

/** Thin, typed calls to the account API. Every call is same-origin through the site's own proxy; no token is ever handled here. */
export const accountApi = {
  config: () => apiGet<AccountConfig>(`${BASE}/config`),
  me: () => apiGet<Account>(`${BASE}/me`),
  register: (input: {
    email: string;
    password: string;
    displayName?: string;
  }) => apiSend<RegisterResponse>("POST", `${BASE}/register`, input),
  login: (input: { email: string; password: string }) =>
    apiSend<Account>("POST", `${BASE}/login`, input),
  logout: () => apiSend("POST", `${BASE}/logout`),
  logoutEverywhere: () => apiSend("POST", `${BASE}/logout-all`),
  verifyEmail: (token: string) =>
    apiSend<{ message: string }>("POST", `${BASE}/verify-email`, { token }),
  resendVerification: (email: string) =>
    apiSend<{ message: string }>("POST", `${BASE}/resend-verification`, {
      email,
    }),
  forgotPassword: (email: string) =>
    apiSend<{ message: string }>("POST", `${BASE}/forgot-password`, { email }),
  resetPassword: (token: string, newPassword: string) =>
    apiSend<{ message: string }>("POST", `${BASE}/reset-password`, {
      token,
      newPassword,
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiSend<{ message: string }>("POST", `${BASE}/change-password`, {
      currentPassword,
      newPassword,
    }),
  /** Step 0 of connecting Google: the signed-in owner proves the password; the answer is the same-site address that starts the trip. */
  allowGoogleLink: (password: string) =>
    apiSend<{ url: string }>("POST", `${BASE}/oauth/google/link`, {
      password,
    }),
  updateDisplayName: (displayName: string) =>
    apiSend<Account>("PATCH", `${BASE}/me`, { displayName }),
  deleteAccount: (password: string) => apiSend("DELETE", BASE, { password }),
  exportData: () => apiGet<unknown>(`${BASE}/export`),
  profile: () => apiGet<Profile>(`${BASE}/profile`),
  saveProfile: (profile: Partial<Profile>) =>
    apiSend<Profile>("PUT", `${BASE}/profile`, profile),
  clearProfile: () => apiSend("DELETE", `${BASE}/profile`),
  saved: () => apiGet<SavedItems>(`${BASE}/saved`),
  saveProgram: (identifier: string) =>
    apiSend("PUT", `${BASE}/saved/programs/${encodeURIComponent(identifier)}`),
  unsaveProgram: (identifier: string) =>
    apiSend(
      "DELETE",
      `${BASE}/saved/programs/${encodeURIComponent(identifier)}`,
    ),
  saveUniversity: (slug: string) =>
    apiSend("PUT", `${BASE}/saved/universities/${encodeURIComponent(slug)}`),
  unsaveUniversity: (slug: string) =>
    apiSend("DELETE", `${BASE}/saved/universities/${encodeURIComponent(slug)}`),
};
