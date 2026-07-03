/** Result state for the profile settings form (shared by the action and form). */
export type ProfileFormState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };
