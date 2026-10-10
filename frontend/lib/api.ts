import type { Email, StoredStatus } from "./types";
import { isStoredStatus } from "./summary";
import { SAMPLE_EMAILS } from "./mock";


const BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "").replace(/\/+$/, "");
const FORCE_SAMPLE = /^(1|true|yes)$/i.test(process.env.NEXT_PUBLIC_USE_MOCK ?? "");

const TIMEOUT_MS = 8000;

const SEND_TIMEOUT_MS = 30000;

export type DataSource = "api" | "empty" | "error" | "sample";

export interface EmailsResult {
  emails: Email[];
  source: DataSource;
  /** set when we asked the api and it did not work out, for a quiet line under the table */
  problem: string | null;
}

export async function loadEmails(): Promise<EmailsResult> {
  if (!BASE) {
    return FORCE_SAMPLE
      ? { emails: SAMPLE_EMAILS, source: "sample", problem: null }
      : { emails: [], source: "empty", problem: null };
  }

  try {
    const response = await fetch(`${BASE}/emails`, {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`api returned ${response.status}`);
    }

    // an empty array is a legitimate answer, a 404 or html error page is not
    return { emails: normaliseList(await response.json()), source: "api", problem: null };
  } catch (error) {
    // no sample fallback here. if the backend is configured but not answering, showing
    // invented rows is worse than showing nothing, because nothing is at least true
    const reason = error instanceof Error ? error.message : "unknown error";
    return { emails: [], source: "error", problem: reason };
  }
}

/** what the compose page hands over to send. this is the wire shape, not the form's */
export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
}

export type SendResult =
  | { ok: true; email: Email }
  | {
      ok: false;
      /** short sentence for the ui, already safe to put on screen */
      problem: string;
      notImplemented?: boolean;
    };

export async function sendEmail(input: SendEmailInput): Promise<SendResult> {
  if (!BASE) {
    return {
      ok: false,
      notImplemented: true,
      problem: "No backend is configured, so there is nowhere to send this from.",
    };
  }

  let response: Response;
  try {
    response = await fetch(`${BASE}/emails`, {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      body: JSON.stringify({
        to: input.to.trim(),
        subject: input.subject.trim(),
        body: input.body,
      }),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    return { ok: false, problem: `Could not reach the API. ${reason}`.trim() };
  }

  // 404 and 405 are what a server that simply has no POST here answers with. 501 is the
  // explicit "not written yet". all three mean the same thing to the reader
  if (response.status === 404 || response.status === 405 || response.status === 501) {
    return {
      ok: false,
      notImplemented: true,
      problem: "The API at this address cannot send emails, so nothing was sent.",
    };
  }

  if (!response.ok) {
    return { ok: false, problem: `The backend returned ${response.status}.` };
  }

  // a 2xx that does not carry a usable record is still a failed send as far as this ui is
  // concerned, so it is reported rather than treated as a success with empty fields
  const email = normaliseEmail(await response.json().catch(() => null));
  if (!email) {
    return {
      ok: false,
      problem: "The backend accepted the message but did not return a record for it.",
    };
  }

  return { ok: true, email };
}

/** accepts a bare array or the common wrappers so whatever you return will parse */
function normaliseList(payload: unknown): Email[] {
  const list = Array.isArray(payload)
    ? payload
    : isRecord(payload)
      ? firstArray(payload, ["emails", "mails", "data", "results", "items"])
      : [];

  return list.map(normaliseEmail).filter((email): email is Email => email !== null);
}

function firstArray(record: Record<string, unknown>, keys: string[]): unknown[] {
  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  return [];
}

export function normaliseEmail(raw: unknown): Email | null {
  if (!isRecord(raw)) return null;

  const id = firstString(raw, ["_id", "id"]);
  const to = firstString(raw, ["to", "recipient", "email"]);
  const status = raw.status;

  if (!id || !to || !isStoredStatus(status)) return null;

  return {
    id,
    to,
    subject: firstString(raw, ["subject"]) ?? "",
    status: status as StoredStatus,
    createdAt: readDate(raw.created_at ?? raw.createdAt),
    sentAt: readDate(raw.sent_at ?? raw.sentAt),
    seen: raw.seen === true,
    seenAt: readDate(raw.seen_at ?? raw.seenAt),
    openCount: readNumber(raw.open_count ?? raw.openCount),
    error: firstString(raw, ["error"]),
  };
}

function readDate(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number") return new Date(value).toISOString();
  if (isRecord(value) && typeof value.$date === "string") return value.$date;
  return null;
}

function readNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function firstString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") return value;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
