import { parseCareEntry, type ParseCareResult } from "@/domain/care";
import { ALL_DETAIL_FIELD_NAMES } from "@/lib/care-fields";

/**
 * Shared form-reading for care entries, used by single-tree logging/editing and
 * batch logging. Pure (no server-only APIs) so both server actions can import it.
 */

/** Collects only the known detail field names; the per-type Zod schema then
 * decides which are valid for the chosen type (and rejects the rest). */
function collectDetails(formData: FormData): Record<string, string> {
  const details: Record<string, string> = {};
  for (const name of ALL_DETAIL_FIELD_NAMES) {
    const value = formData.get(name);
    if (typeof value === "string" && value.trim() !== "") details[name] = value;
  }
  return details;
}

/** Reads the shared care-entry fields (type/date/title/notes/details) from a
 * submitted form and validates them for `treeId`. For batch logging, pass any one
 * of the selected tree ids — the validated result is applied to all of them. */
export function parseCareForm(treeId: string, formData: FormData): ParseCareResult {
  return parseCareEntry({
    treeId,
    type: formData.get("type"),
    occurredAt: formData.get("occurred_at"),
    title: formData.get("title"),
    notes: formData.get("notes"),
    details: collectDetails(formData),
  });
}
