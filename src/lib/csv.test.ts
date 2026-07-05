import { describe, expect, it } from "vitest";

import { csvCell, rowsToCsv } from "./csv";

describe("csvCell", () => {
  it("renders empty for null/undefined", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });

  it("passes plain values straight through", () => {
    expect(csvCell("Juniper")).toBe("Juniper");
    expect(csvCell(42)).toBe("42");
    expect(csvCell(true)).toBe("true");
  });

  it("quotes and escapes commas, quotes, and newlines (RFC 4180)", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('she said "hi"')).toBe('"she said ""hi"""');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("serializes objects/arrays as compact JSON", () => {
    expect(csvCell({ interval_days: 14, anchor: "completion" })).toBe(
      '"{""interval_days"":14,""anchor"":""completion""}"',
    );
    // The JSON string "[1,2]" contains a comma, so it is then RFC-4180 quoted.
    expect(csvCell([1, 2])).toBe('"[1,2]"');
  });

  it("neutralizes formula-injection leaders with a leading apostrophe", () => {
    // Excel/Sheets would execute these; the guard prefixes an apostrophe.
    expect(csvCell("=1+1")).toBe("'=1+1");
    expect(csvCell("+SUM(A1)")).toBe("'+SUM(A1)");
    expect(csvCell("-2")).toBe("'-2");
    expect(csvCell("@cmd")).toBe("'@cmd");
  });

  it("still quotes a neutralized value that also contains a comma", () => {
    // Leading '=' triggers the apostrophe; the comma then forces quoting.
    expect(csvCell("=A1,B1")).toBe('"\'=A1,B1"');
  });

  it("does not treat a hyphen mid-string as a formula", () => {
    expect(csvCell("well-drained")).toBe("well-drained");
  });
});

describe("rowsToCsv", () => {
  it("returns an empty string for no rows", () => {
    expect(rowsToCsv([])).toBe("");
  });

  it("emits a header row then data rows, CRLF-separated", () => {
    const csv = rowsToCsv([
      { id: "1", name: "Juniper" },
      { id: "2", name: "Maple" },
    ]);
    expect(csv).toBe("id,name\r\n1,Juniper\r\n2,Maple");
  });

  it("uses the union of keys (first-seen order) so sparse rows stay aligned", () => {
    const csv = rowsToCsv([
      { id: "1", name: "Juniper" },
      { id: "2", notes: "backup" },
    ]);
    expect(csv).toBe("id,name,notes\r\n1,Juniper,\r\n2,,backup");
  });
});
