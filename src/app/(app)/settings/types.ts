/** Result state for the profile settings form (shared by the action and form). */
export type ProfileFormState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

/**
 * Result state for the account-deletion form. Success has no state — the action
 * redirects to the login page — so only idle/error surface here.
 */
export type DeleteAccountState = { status: "idle" } | { status: "error"; message: string };
