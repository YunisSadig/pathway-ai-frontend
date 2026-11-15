import type { Page } from "@/types/api";
import type {
  ProgramDetail,
  ProgramListItem,
  ProgramQuery,
} from "@/types/program";
import { apiGet } from "./client";

export const listPrograms = (query: ProgramQuery = {}, init?: RequestInit) =>
  apiGet<Page<ProgramListItem>>("/api/v1/programs", { ...query }, init);

/** The public tier: published-offering fields only, no account needed (same row shape as the list, tuition filters not offered). */
export const listPublicPrograms = (
  query: ProgramQuery = {},
  init?: RequestInit,
) => {
  const { tuitionMax, tuitionCurrency, tuitionCategory, ...open } = query;
  void tuitionMax;
  void tuitionCurrency;
  void tuitionCategory;
  return apiGet<Page<ProgramListItem>>(
    "/api/v1/public/programs",
    { ...open },
    init,
  );
};

export const getPublicProgram = (identifier: string, init?: RequestInit) =>
  apiGet<ProgramListItem>(
    `/api/v1/public/programs/${encodeURIComponent(identifier)}`,
    undefined,
    init,
  );

export const getProgram = (identifier: string, init?: RequestInit) =>
  apiGet<ProgramDetail>(
    `/api/v1/programs/${encodeURIComponent(identifier)}`,
    undefined,
    init,
  );
