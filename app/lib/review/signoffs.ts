// Clinical and government sign-offs: a reviewer's decision about one item of
// the review registry (registry.ts), by a person, with their role and the
// date. Real sign-offs only — never pre-filled. Kept in its own small module
// so pages can show an item's review status without loading the registry.

export type SignOff = { itemId: string; role: string; date: string; decision: "approved" | "changes-needed" | "deprecated"; note?: string };

export const SIGN_OFFS: SignOff[] = [];

export const isApproved = (itemId: string) => SIGN_OFFS.some((s) => s.itemId === itemId && s.decision === "approved");
