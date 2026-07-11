import { describe, expect, it } from "vitest";

import {
  clampText,
  describeError,
  parseClientErrorReport,
  pathnameOnly,
  serverErrorArgs,
} from "./app-error-report";

describe("clampText", () => {
  it("keeps a non-empty string, clamped to max", () => {
    expect(clampText("hello", 10)).toBe("hello");
    expect(clampText("abcdef", 3)).toBe("abc");
  });

  it("returns undefined for blank / non-string values", () => {
    expect(clampText("   ", 10)).toBeUndefined();
    expect(clampText("", 10)).toBeUndefined();
    expect(clampText(undefined, 10)).toBeUndefined();
    expect(clampText(null, 10)).toBeUndefined();
    expect(clampText(42, 10)).toBeUndefined();
  });
});

describe("pathnameOnly", () => {
  it("drops the query string and hash (which can carry ids/tokens)", () => {
    expect(pathnameOnly("/collection/abc?token=secret")).toBe("/collection/abc");
    expect(pathnameOnly("/tree/1#section")).toBe("/tree/1");
    expect(pathnameOnly("/today")).toBe("/today");
  });

  it("returns undefined for blank input", () => {
    expect(pathnameOnly("")).toBeUndefined();
    expect(pathnameOnly(undefined)).toBeUndefined();
  });
});

describe("describeError", () => {
  it("uses an Error's message, falling back to its name", () => {
    expect(describeError(new Error("boom"))).toBe("boom");
    expect(describeError(new TypeError(""))).toBe("TypeError");
  });

  it("handles strings and non-Error values", () => {
    expect(describeError("plain string")).toBe("plain string");
    expect(describeError({ code: 42 })).toBe('{"code":42}');
    expect(describeError(undefined)).toBe(String(undefined));
  });
});

describe("parseClientErrorReport", () => {
  it("returns null for a non-object body (untrusted input is not trusted)", () => {
    expect(parseClientErrorReport(null, {})).toBeNull();
    expect(parseClientErrorReport("oops", {})).toBeNull();
    expect(parseClientErrorReport(123, {})).toBeNull();
    expect(parseClientErrorReport(["a"], {})).toBeNull();
  });

  it("builds client args, stripping the query string and bounding lengths", () => {
    const args = parseClientErrorReport(
      {
        context: "global-error-boundary",
        message: "x".repeat(5000),
        digest: "abc123",
        path: "/collection/xyz?secret=1",
        extra: "ignored",
      },
      { userAgent: "UA/1.0", release: "sha-deadbeef" },
    );
    expect(args).not.toBeNull();
    expect(args?.p_source).toBe("client");
    expect(args?.p_context).toBe("global-error-boundary");
    expect(args?.p_message).toHaveLength(2000);
    expect(args?.p_digest).toBe("abc123");
    expect(args?.p_path).toBe("/collection/xyz");
    expect(args?.p_user_agent).toBe("UA/1.0");
    expect(args?.p_release).toBe("sha-deadbeef");
  });

  it("omits blank/absent fields rather than sending nulls", () => {
    const args = parseClientErrorReport({ context: "boundary" }, {});
    expect(args?.p_message).toBeUndefined();
    expect(args?.p_path).toBeUndefined();
    expect(args?.p_user_agent).toBeUndefined();
    expect(args?.p_release).toBeUndefined();
  });
});

describe("serverErrorArgs", () => {
  it("tags source='server' and describes the error", () => {
    const args = serverErrorArgs("createTree", new Error("db down"), "sha1");
    expect(args.p_source).toBe("server");
    expect(args.p_context).toBe("createTree");
    expect(args.p_message).toBe("db down");
    expect(args.p_release).toBe("sha1");
  });

  it("tolerates a missing release", () => {
    const args = serverErrorArgs("createTree", "oops", null);
    expect(args.p_release).toBeUndefined();
    expect(args.p_message).toBe("oops");
  });
});
