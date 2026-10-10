import type { DisplayStatus } from "./types";

const DATE_TIME_PARTS = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const DATE_PARTS = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/** null for anything missing so callers can decide between a dash and nothing at all */
export function formatDateTime(iso: string | null): string | null {
  return assemble(DATE_TIME_PARTS, iso, true);
}

export function formatDate(iso: string | null): string | null {
  return assemble(DATE_PARTS, iso, false);
}

function assemble(formatter: Intl.DateTimeFormat, iso: string | null, withTime: boolean): string | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;

  const parts = new Map<string, string>();
  for (const part of formatter.formatToParts(parsed)) {
    parts.set(part.type, part.value);
  }

  const day = parts.get("day");
  const month = parts.get("month")?.slice(0, 3);
  const year = parts.get("year");
  if (!day || !month || !year) return null;

  if (!withTime) return `${day} ${month} ${year}`;

  const hour = parts.get("hour");
  const minute = parts.get("minute");
  if (!hour || !minute) return `${day} ${month} ${year}`;

  return `${day} ${month} ${year}, ${hour}:${minute}`;
}

/** open rate to one place, same as the f"{open_rate:.1f}%" in show.py */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

interface StatusMeta {
  label: string;
  /** muted on purpose, none of these are bright */
  dot: string;
  text: string;
}

const STATUS: Record<DisplayStatus, StatusMeta> = {
  opened: { label: "Opened", dot: "bg-[#6f8f7f]", text: "text-[#8aa595]" },
  sent: { label: "Sent", dot: "bg-[#6d6a64]", text: "text-[#969289]" },
  pending: { label: "Pending", dot: "bg-[#8a7f6a]", text: "text-[#a3977f]" },
  failed: { label: "Failed", dot: "bg-[#96625c]", text: "text-[#a8736c]" },
};

export function statusMeta(status: DisplayStatus): StatusMeta {
  return STATUS[status];
}

export function safeError(raw: string | null): string | null {
  if (!raw) return null;

  const friendly = FRIENDLY_ERRORS[raw.split(":")[0]?.trim()];

  const cleaned = friendly ?? redact(raw);

  if (!cleaned) return null;
  return cleaned.length > 280 ? `${cleaned.slice(0, 277)}...` : cleaned;
}

/** only the handful worth saying in plain words, everything else falls back to redacted raw */
const FRIENDLY_ERRORS: Record<string, string> = {
  SMTPAuthenticationError: "The mail server rejected the sender credentials.",
  SMTPServerDisconnected: "The connection to the mail server closed unexpectedly.",
  SMTPRecipientsRefused: "The mail server refused this recipient address.",
  SMTPResponseException: "The mail server rejected the message.",
  SMTPConnectError: "Could not reach the mail server.",
  SMTPSenderRefused: "The mail server refused the sender address.",
  TimeoutError: "The connection timed out.",
  ServerSelectionTimeoutError: "Could not reach the database.",
};

/** order matters, the connection string has to go before the looser host/email rules */
const REDACTIONS: Array<[RegExp, string]> = [
  // mongodb+srv://user:password@cluster.mongodb.net and anything shaped like user:pass@host
  [/\b[a-z][a-z0-9+.-]*:\/\/[^\s/@]+:[^\s/@]+@[^\s]+/gi, "[redacted]"],
  [/\b[\w.+-]+:[\w!#$%&*'+/=?^`{|}~-]+@[^\s.]+\.[^\s]+/g, "[redacted]"],
  // bare addresses, keep the shape so it still reads like an email problem
  [/\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g, "[address]"],
  [/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[host]"],
  // anything that looks like a long opaque token, including any base64 padding on the end
  [/\b[A-Za-z0-9_-]{32,}={0,2}/g, "[redacted]"],
];

function redact(input: string): string {
  let output = input;
  for (const [pattern, replacement] of REDACTIONS) {
    output = output.replace(pattern, replacement);
  }
  return output.replace(/\s+/g, " ").trim();
}