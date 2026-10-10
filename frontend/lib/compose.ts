
export interface Draft {
  to: string;
  subject: string;
  body: string;
}

export const EMPTY_DRAFT: Draft = { to: "", subject: "", body: "" };

export type FieldName = keyof Draft;

/** one message per offending field, absent means that field is fine */
export type FieldErrors = Partial<Record<FieldName, string>>;

const ADDRESS = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

export function looksLikeAddress(value: string): boolean {
  return ADDRESS.test(value.trim());
}

export function isDraftEmpty(draft: Draft): boolean {
  return !draft.to.trim() && !draft.subject.trim() && !draft.body.trim();
}

export function validateForSend(draft: Draft): FieldErrors {
  const errors: FieldErrors = {};

  if (!draft.to.trim()) {
    errors.to = "Add a recipient address.";
  } else if (!looksLikeAddress(draft.to)) {
    errors.to = "That does not look like an email address.";
  }

  if (!draft.subject.trim()) {
    errors.subject = "Add a subject line.";
  }

  if (!draft.body.trim()) {
    errors.body = "Write something to send.";
  }

  return errors;
}

export function validateForDraft(draft: Draft): FieldErrors {
  return isDraftEmpty(draft) ? { body: "Nothing to save yet." } : {};
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

const DRAFT_KEY = "coldmail.compose.draft.v1";

export function loadDraft(): Draft | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;

    const record = parsed as Record<string, unknown>;
    const read = (key: FieldName): string =>
      typeof record[key] === "string" ? (record[key] as string) : "";

    const draft: Draft = { to: read("to"), subject: read("subject"), body: read("body") };
    return isDraftEmpty(draft) ? null : draft;
  } catch {
    return null;
  }
}

export function storeDraft(draft: Draft): boolean {
  if (typeof window === "undefined") return false;

  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    return true;
  } catch {
    // private browsing and a full quota both land here. the draft is still on screen, so
    // failing to persist it is worth reporting but never worth throwing over
    return false;
  }
}

export function discardDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // as above, nothing useful to do
  }
}