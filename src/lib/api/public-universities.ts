import type { Page } from "@/types/api";
import type { UniversityQuery, UniversitySummary } from "@/types/university";
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

/** The same list for the discovery explorer (country filter included); rows are a superset of the protected summary. */
export const searchPublicUniversities = (
  query: UniversityQuery = {},
  init?: RequestInit,
) =>
  apiGet<Page<UniversitySummary>>(
    BASE,
    {
      q: query.q,
      country: query.country,
      page: query.page,
      size: query.size,
    },
    init,
  );

export const getPublicUniversity = (slug: string, signal?: AbortSignal) =>
  apiGet<PublicUniversity>(`${BASE}/${encodeURIComponent(slug)}`, undefined, {
    signal,
  });
