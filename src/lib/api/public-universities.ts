import { apiGet } from "./client";

/** What a visitor may see about one institution (the backend allow-list; nothing academic). */
export interface PublicUniversity {
  slug: string;
  name: string;
  city: string | null;
  countryCode: string;
  countryName: string;
  websiteUrl: string | null;
  trackedPrograms: number;
  verifiedOn: string | null;
}

export interface PublicUniversityPage {
  content: PublicUniversity[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

const BASE = "/api/v1/public/universities";

export const listPublicUniversities = (
  q: string,
  page = 0,
  size = 12,
  signal?: AbortSignal,
) =>
  apiGet<PublicUniversityPage>(
    BASE,
    { q: q.trim() || undefined, page, size },
    { signal },
  );

export const getPublicUniversity = (slug: string, signal?: AbortSignal) =>
  apiGet<PublicUniversity>(`${BASE}/${encodeURIComponent(slug)}`, undefined, {
    signal,
  });
