"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

import type { ProfileFormState } from "./types";

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
