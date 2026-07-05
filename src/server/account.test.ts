import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import type { Database } from "@/types/database.types";

import { chunk, collectUserStoragePaths, deleteAccount } from "./account";

/**
 * The DB cascade itself is proven by pgTAP (delete_account_test.sql). These
 * tests pin the *orchestration* contract that pgTAP can't see: storage bytes are
 * removed before the account row, and a storage failure aborts before the
 * irreversible delete.
 */

type Entry = { name: string; id: string | null };

/** A minimal Supabase mock: a two-level storage tree + an rpc, recording calls. */
function makeMock(opts: {
  tree: Record<string, Record<string, string[]>>; // userId → folder → filenames
  removeError?: string;
  rpcError?: string;
}) {
  const calls: string[] = [];

  const list = vi.fn(async (prefix: string) => {
    calls.push(`list:${prefix}`);
    const [userId, folder] = prefix.split("/");
    const folders = opts.tree[userId!] ?? {};
    let entries: Entry[];
    if (folder === undefined) {
      entries = Object.keys(folders).map((name) => ({ name, id: null }));
    } else {
      entries = (folders[folder] ?? []).map((name, i) => ({ name, id: `id-${folder}-${i}` }));
    }
    return { data: entries, error: null };
  });

  const remove = vi.fn(async (paths: string[]) => {
    calls.push(`remove:${paths.length}`);
    return { data: null, error: opts.removeError ? { message: opts.removeError } : null };
  });

  const rpc = vi.fn(async (name: string) => {
    calls.push(`rpc:${name}`);
    return { data: null, error: opts.rpcError ? { message: opts.rpcError } : null };
  });

  const bucket = { list, remove };
  const supabase = {
    storage: { from: () => bucket },
    rpc,
  } as unknown as SupabaseClient<Database>;

  return { supabase, calls, list, remove, rpc };
}

describe("chunk", () => {
  it("splits into fixed-size batches", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
  it("returns [] for an empty input", () => {
    expect(chunk([], 100)).toEqual([]);
  });
});

describe("collectUserStoragePaths", () => {
  it("walks two levels and returns full object paths", async () => {
    const { supabase } = makeMock({
      tree: { u1: { t1: ["a.webp", "b.webp"], t2: ["c.webp"] } },
    });
    const paths = await collectUserStoragePaths(supabase, "u1");
    expect(paths).toEqual(["u1/t1/a.webp", "u1/t1/b.webp", "u1/t2/c.webp"]);
  });
});

describe("deleteAccount", () => {
  it("removes storage bytes BEFORE deleting the account", async () => {
    const { supabase, calls } = makeMock({ tree: { u1: { t1: ["a.webp"] } } });
    await deleteAccount(supabase, "u1");

    const removeIdx = calls.findIndex((c) => c.startsWith("remove:"));
    const rpcIdx = calls.findIndex((c) => c.startsWith("rpc:"));
    expect(removeIdx).toBeGreaterThanOrEqual(0);
    expect(rpcIdx).toBeGreaterThan(removeIdx);
    expect(calls.at(-1)).toBe("rpc:delete_my_account");
  });

  it("aborts before deleting the account if storage removal fails", async () => {
    const { supabase, calls, rpc } = makeMock({
      tree: { u1: { t1: ["a.webp"] } },
      removeError: "network down",
    });
    await expect(deleteAccount(supabase, "u1")).rejects.toThrow(/remove photos/);
    expect(rpc).not.toHaveBeenCalled();
    expect(calls.some((c) => c.startsWith("rpc:"))).toBe(false);
  });

  it("surfaces an account-deletion error", async () => {
    const { supabase } = makeMock({ tree: { u1: {} }, rpcError: "permission denied" });
    await expect(deleteAccount(supabase, "u1")).rejects.toThrow(/delete account/);
  });

  it("still deletes the account when there are no photos", async () => {
    const { supabase, remove, rpc } = makeMock({ tree: { u1: {} } });
    await deleteAccount(supabase, "u1");
    expect(remove).not.toHaveBeenCalled(); // nothing to remove
    expect(rpc).toHaveBeenCalledWith("delete_my_account");
  });
});
