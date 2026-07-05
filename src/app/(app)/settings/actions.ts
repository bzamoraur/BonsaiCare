"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { deleteAccount } from "@/server/account";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

import type { DeleteAccountState, ProfileFormState } from "./types";

/** The exact word a user must type to confirm irreversible account deletion. */
const DELETE_CONFIRMATION = "DELETE";

type Hemisphere = Database["public"]["Enums"]["hemisphere"];
type Units = Database["public"]["Enums"]["units"];

const HEMISPHERES: readonly Hemisphere[] = ["northern", "southern"];
const UNITS: readonly Units[] = ["metric", "imperial"];

/**
 * Updates the signed-in user's profile (display name, hemisphere, units).
 * RLS restricts the write to the caller's own row; we additionally scope by id
 * and validate the enum values before writing.
 */
export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "You are not signed in." };
  }

  const hemisphere = formData.get("hemisphere");
  const units = formData.get("units");
  const displayNameRaw = formData.get("display_name");

  if (typeof hemisphere !== "string" || !HEMISPHERES.includes(hemisphere as Hemisphere)) {
    return { status: "error", message: "Please choose a valid hemisphere." };
  }
  if (typeof units !== "string" || !UNITS.includes(units as Units)) {
    return { status: "error", message: "Please choose a valid unit system." };
  }

  const displayName = typeof displayNameRaw === "string" ? displayNameRaw.trim() : "";

  const { error } = await supabase
    .from("profiles")
    .update({
      hemisphere: hemisphere as Hemisphere,
      units: units as Units,
      display_name: displayName === "" ? null : displayName,
    })
    .eq("id", user.id);

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/settings");
  return { status: "success" };
}

/**
 * Permanently deletes the signed-in user's account and all their data (rows +
 * storage). Requires typing the exact confirmation word. On success it clears
 * the session and redirects to login; there is no success state to render.
 */
export async function deleteAccountAction(
  _prev: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const confirmation = formData.get("confirmation");
  if (typeof confirmation !== "string" || confirmation.trim() !== DELETE_CONFIRMATION) {
    return { status: "error", message: `Type ${DELETE_CONFIRMATION} to confirm.` };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "You are not signed in." };
  }

  try {
    await deleteAccount(supabase, user.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "We could not delete your account.";
    return { status: "error", message };
  }

  // The account row is gone; clear the now-orphaned session cookies locally.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?deleted=1");
}
