/**
 * Localized full month names, index 0 = January … 11 = December, for the given
 * locale (e.g. "enero" in es, "January" in en). Used by the season pickers, whose
 * `<option value>` stays the 1-based month number — only the label is localized.
 *
 * The instant is built with `Date.UTC` and formatted in UTC so the month never
 * shifts a day back in western timezones (the same trap the calendar hit).
 */
export function monthNames(locale: string): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" });
  return Array.from({ length: 12 }, (_, i) => fmt.format(Date.UTC(2000, i, 1)));
}
