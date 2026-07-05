/**
 * Minimal, dependency-free CSV encoder for data export (ADR-0008).
 *
 * The JSON export is the lossless/round-trip format; CSV is the spreadsheet-
 * friendly view. Two things matter here:
 *  - **Correctness** — RFC-4180 quoting (double quotes, CRLF, embedded quotes).
 *  - **Safety** — CSV/formula injection: a cell beginning with `= + - @` (or a
 *    control char) can execute in Excel/Sheets even inside quotes, so such cells
 *    are neutralised with a leading apostrophe (OWASP guidance). This alters only
 *    the CSV rendering of those cells; the JSON export preserves the true value.
 */

const FORMULA_LEADERS = new Set(["=", "+", "-", "@", "\t", "\r"]);

/** Serialize one cell value to its CSV string form (objects → compact JSON). */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text: string;
  if (typeof value === "object") {
    text = JSON.stringify(value);
  } else {
    text = String(value);
  }

  // Formula-injection guard: neutralise a leading active character.
  if (text.length > 0 && FORMULA_LEADERS.has(text[0]!)) {
    text = `'${text}`;
  }

  // RFC-4180 quoting: quote if the field contains a quote, comma, or newline.
  if (/[",\r\n]/.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * Encode rows to a CSV string. Columns are the union of keys across all rows
 * (stable first-seen order), so a sparse row never shifts another row's cells.
 * An empty input yields an empty string.
 */
export function rowsToCsv(rows: ReadonlyArray<Record<string, unknown>>): string {
  if (rows.length === 0) return "";

  const columns: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push(key);
      }
    }
  }

  const lines: string[] = [columns.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(columns.map((col) => csvCell(row[col])).join(","));
  }
  return lines.join("\r\n");
}
