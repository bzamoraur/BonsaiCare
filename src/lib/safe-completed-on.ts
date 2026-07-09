/**
 * A trusted "YYYY-MM-DD" completion date (real calendar validity), else today.
 * Shared by the Today and Calendar task actions so a hand-crafted `completedOn`
 * can't reach `completeTask`/`skipTask`. Pure — safe to import from any action.
 */
export function safeCompletedOn(raw: FormDataEntryValue | null): string {
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T00:00:00Z`);
    if (!Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === raw) return raw;
  }
  return new Date().toISOString().slice(0, 10);
}
