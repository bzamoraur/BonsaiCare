/** Result state for the task create/edit forms. Create stays on the page (the
 * task appears in the care plan), so there's a distinct success state. */
export type TaskFormState =
  { status: "idle" } | { status: "success" } | { status: "error"; message: string };
