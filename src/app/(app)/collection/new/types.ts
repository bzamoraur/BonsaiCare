/** Result state for the add-tree form. Success navigates away (redirect), so the
 * only rendered state is an error message. */
export type NewTreeFormState = { status: "idle" } | { status: "error"; message: string };
