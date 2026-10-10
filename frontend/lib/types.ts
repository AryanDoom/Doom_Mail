
/** the three values status is ever written as */
export type StoredStatus = "pending" | "sent" | "failed";

export type DisplayStatus = "opened" | "sent" | "pending" | "failed";

export interface Email {
  id: string;
  to: string;
  subject: string;
  status: StoredStatus;
  /** iso string, always utc */
  createdAt: string | null;
  /** iso string or null, null while still pending or after a failure */
  sentAt: string | null;
  /** true once the worker has recorded at least one pixel hit */
  seen: boolean;
  /** iso string of the most recent pixel hit, this is the last open */
  seenAt: string | null;
  /** how many times the pixel has been requested */
  openCount: number;
  /** raw failure text straight off the send, only set when status is failed */
  error: string | null;
}

/** mirrors the five count_documents calls plus the derived numbers in localstuff/show.py */
export interface Summary {
  total: number;
  sent: number;
  opened: number;
  unopened: number;
  failed: number;
  pending: number;
  /** percent of sent emails whose pixel was requested, 0 when nothing has sent */
  openRate: number;
}
