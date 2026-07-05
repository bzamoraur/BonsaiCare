import { describe, expect, it } from "vitest";

import { extensionFromPath, photoEntryName, sanitizeSegment } from "./photo-archive-name";

describe("sanitizeSegment", () => {
  it("keeps letters, digits, spaces, and hyphens", () => {
    expect(sanitizeSegment("Chinese juniper 2", "x")).toBe("Chinese juniper 2");
    expect(sanitizeSegment("well-drained #1", "x")).toBe("well-drained #1");
  });

  it("replaces path separators and reserved chars, collapsing spaces", () => {
    expect(sanitizeSegment("a/b\\c:d*e?", "x")).toBe("a b c d e");
  });

  it("removes path separators so a folder segment can't traverse", () => {
    const result = sanitizeSegment("../../etc/passwd", "x");
    expect(result).not.toMatch(/[/\\]/);
    expect(result).toBe(".. .. etc passwd");
  });

  it("falls back when nothing usable remains", () => {
    expect(sanitizeSegment("", "Unfiled")).toBe("Unfiled");
    expect(sanitizeSegment("///", "Unfiled")).toBe("Unfiled");
  });

  it("preserves unicode letters (accents)", () => {
    expect(sanitizeSegment("Árbol niño", "x")).toBe("Árbol niño");
  });
});

describe("extensionFromPath", () => {
  it("extracts a lowercase extension", () => {
    expect(extensionFromPath("uid/tree/photo.WEBP")).toBe("webp");
    expect(extensionFromPath("uid/tree/photo.jpeg")).toBe("jpeg");
  });

  it("uses the last extension for multi-dot names", () => {
    expect(extensionFromPath("uid/tree/weird.tar.gz")).toBe("gz");
  });

  it("defaults to jpg for missing or odd extensions", () => {
    expect(extensionFromPath("uid/tree/noext")).toBe("jpg");
    expect(extensionFromPath("uid/tree/trailing.")).toBe("jpg");
    expect(extensionFromPath("uid/tree/.hidden")).toBe("jpg");
    expect(extensionFromPath("uid/tree/file.verylongext")).toBe("jpg"); // > 5 chars
    expect(extensionFromPath("uid/tree/file.p g")).toBe("jpg"); // non-alphanumeric
  });
});

describe("photoEntryName", () => {
  const used = new Set<string>();

  it("groups by tree folder and names by date + short id", () => {
    const name = photoEntryName(
      {
        treeName: "Chinese juniper",
        storagePath: "uid/tree/abc.webp",
        takenAt: "2026-05-01T10:00:00.000Z",
        id: "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
      },
      used,
    );
    expect(name).toBe("Chinese juniper/2026-05-01-a1b2c3d4.webp");
  });

  it("files tree-less photos under Unfiled and undated when no date", () => {
    const name = photoEntryName(
      { treeName: null, storagePath: "uid/x.jpg", takenAt: null, id: "ffffffff-0000" },
      new Set(),
    );
    expect(name).toBe("Unfiled/undated-ffffffff.jpg");
  });

  it("de-duplicates colliding names within one archive", () => {
    const seen = new Set<string>();
    const base = {
      treeName: "Maple",
      storagePath: "uid/tree/x.webp",
      takenAt: "2026-05-01T00:00:00Z",
      id: "aaaaaaaa-bbbb",
    };
    const first = photoEntryName(base, seen);
    const second = photoEntryName(base, seen);
    expect(first).toBe("Maple/2026-05-01-aaaaaaaa.webp");
    expect(second).toBe("Maple/2026-05-01-aaaaaaaa-1.webp");
  });
});
