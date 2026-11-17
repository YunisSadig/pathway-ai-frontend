import type { Key } from "@/lib/i18n";

/**
 * How a curated program's degree is described. A combined bachelor's + master's pathway is a bachelor's ENTRY, never a
 * standalone bachelor's degree; a standalone bachelor's says so. Without curation data the existing labels apply.
 */
export function degreeLabelKey(
  degreeLevel: string,
  pathway: "BACHELOR_AND_MASTER" | "SINGLE_DEGREE" | null | undefined,
): Key | null {
  if (degreeLevel === "BACHELOR") {
    if (pathway === "BACHELOR_AND_MASTER") return "unifact.pathwayCombined";
    if (pathway === "SINGLE_DEGREE") return "unifact.pathwayBachelor";
    return "unifact.bachelorEntry";
  }
  if (degreeLevel === "MASTER") return "unifact.master";
  return null;
}
