/** Result state for the log-care form. Success stays on the page (the entry
 * appears in the care log), so there's a distinct success state. */
export type LogCareState =
  { status: "idle" } | { status: "success" } | { status: "error"; message: string };
