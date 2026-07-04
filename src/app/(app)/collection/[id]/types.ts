/** Result state for the edit-tree form. Success navigates away (redirect), so the
 * only rendered state is an error message. */
export type TreeFormState = { status: "idle" } | { status: "error"; message: string };
