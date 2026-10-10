"use client";

import { StatusBadge } from "./StatusBadge";
import { displayStatus, byNewest } from "@/lib/summary";
import { formatDateTime } from "@/lib/format";
import type { Email } from "@/lib/types";

const GRID =
  "grid grid-cols-1 gap-x-6 gap-y-1.5 px-3 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1.4fr)_7rem_6.5rem] md:items-center md:gap-y-0";

interface Props {
  emails: Email[];
  selectedId: string | null;
  onSelect: (email: Email) => void;
  loading: boolean;
  emptyNote?: string | null;
}

export function EmailList({ emails, selectedId, onSelect, loading, emptyNote }: Props) {
  if (loading) return <ListSkeleton />;

  if (emails.length === 0) {
    return (
      <div className="border-t border-ink/[0.09] px-3 py-7">
        <p className="text-[13px] text-ink/85">No emails yet.</p>
        {emptyNote && <p className="mt-1.5 text-[13px] text-muted">{emptyNote}</p>}
      </div>
    );
  }

  const ordered = [...emails].sort(byNewest);

  return (
    <div>
      {/* visual column labels only. each row is a button whose accessible name already
          carries every value, so a screen reader does not need the header at all */}
      <div aria-hidden="true" className={`${GRID} label pb-3`}>
        <span>Recipient</span>
        <span>Subject</span>
        <span>Status</span>
        <span className="text-right">Sent</span>
      </div>

      <ul className="border-t border-ink/[0.09]">
        {ordered.map((email) => {
          const selected = email.id === selectedId;
          const sent = formatDateTime(email.sentAt);

          return (
            <li key={email.id}>
              <button
                type="button"
                onClick={() => onSelect(email)}
                aria-current={selected ? "true" : undefined}
                aria-label={`${email.to}, ${email.subject || "no subject"}, ${displayStatus(email)}`}
                className={[
                  GRID,
                  "group relative w-full border-b border-ink/[0.055] py-3 text-left",
                  "transition-colors duration-200 hover:bg-ink/[0.035]",
                  selected ? "bg-ink/[0.05]" : "",
                ].join(" ")}
              >
                {/* hairline marker in the gutter, grows on hover and stays put when selected */}
                <span
                  aria-hidden="true"
                  className={[
                    "absolute left-0 top-1/2 h-5 w-px -translate-y-1/2 bg-ink/50 transition-opacity duration-200",
                    selected ? "opacity-100" : "opacity-0 group-hover:opacity-60",
                  ].join(" ")}
                />

                <span className="truncate text-[13px] text-ink/90">{email.to}</span>

                <span className="truncate text-[13px] text-muted group-hover:text-ink/70">
                  {email.subject || <span className="text-faint italic">no subject</span>}
                </span>

                {/* contents on md dissolves this box so status and date line up with the
                    header columns, on mobile it stays a flex row under the subject */}
                <span className="flex items-center justify-between gap-4 md:contents">
                  <StatusBadge status={displayStatus(email)} />
                  <time
                    dateTime={email.sentAt ?? undefined}
                    className="shrink-0 text-right text-[12px] tabular-nums text-muted"
                  >
                    {sent ?? "—"}
                  </time>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse border-t border-ink/[0.09]">
      {[68, 84, 55, 76, 62, 80].map((width, i) => (
        <div key={i} className="flex items-center gap-6 border-b border-ink/[0.055] px-3 py-3.5">
          <div className="h-2.5 rounded-full bg-ink/[0.07]" style={{ width: `${width * 0.4}%` }} />
          <div className="h-2.5 rounded-full bg-ink/[0.05]" style={{ width: `${width}%` }} />
        </div>
      ))}
    </div>
  );
}