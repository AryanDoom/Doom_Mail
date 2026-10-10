import type { DisplayStatus, Email, StoredStatus, Summary } from "./types";

export function summarise(emails: Email[]): Summary {
  let sent = 0;
  let opened = 0;
  let failed = 0;
  let pending = 0;

  for (const email of emails) {
    if (email.status === "sent") {
      sent += 1;
      if (email.seen) opened += 1;
    } else if (email.status === "failed") {
      failed += 1;
    } else if (email.status === "pending") {
      pending += 1;
    }
  }

  const unopened = sent - opened;

  return {
    total: emails.length,
    sent,
    opened,
    unopened,
    failed,
    pending,
    openRate: sent > 0 ? (opened / sent) * 100 : 0,
  };
}

export function displayStatus(email: Email): DisplayStatus {
  if (email.status === "failed") return "failed";
  if (email.status === "pending") return "pending";
  return email.seen ? "opened" : "sent";
}

/** newest first, same as sorting by created_at desc on the server would give */
export function byNewest(a: Email, b: Email): number {
  return timeOf(b) - timeOf(a);
}

function timeOf(email: Email): number {
  const raw = email.sentAt ?? email.createdAt;
  if (!raw) return 0;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function isStoredStatus(value: unknown): value is StoredStatus {
  return value === "pending" || value === "sent" || value === "failed";
}