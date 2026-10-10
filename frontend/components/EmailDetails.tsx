"use client";

import { useEffect, useRef } from "react";
import { StatusBadge } from "./StatusBadge";
import { displayStatus } from "@/lib/summary";
import { formatDateTime, safeError } from "@/lib/format";
import type { Email } from "@/lib/types";

/** label above value, hairline between, no boxes */
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-ink/[0.06] py-2.5 last:border-b-0">
      <span className="label shrink-0 pt-[2px]">{label}</span>
      <span className="text-right text-[13px] tabular-nums text-ink/85">{value}</span>
    </div>
  );
}

export function EmailDetails({ email, onClose }: { email: Email | null; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!email) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [email, onClose]);

  // move focus into the panel when it opens so keyboard and screen reader users land
  // somewhere sensible instead of staying on the row they clicked
  useEffect(() => {
    if (email) panel.current?.focus();
  }, [email]);

  const open = email !== null;
  const status = email ? displayStatus(email) : null;
  const error = email ? safeError(email.error) : null;

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={[
          "fixed inset-0 z-40 bg-black/50 transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal={open}
        aria-label={email ? `Details for ${email.to}` : "Email details"}
        tabIndex={-1}
        className={[
          "fixed right-0 top-0 z-50 flex h-screen w-full flex-col outline-none",
          // opaque like the sidebar. this was bg-shell/94 over backdrop-blur-xl
          "border-l border-ink/[0.08] bg-shell",
          "transition-transform duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          "sm:w-[26rem] lg:w-[28rem]",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {email && (
          <>
            <header className="flex items-start justify-between gap-4 px-7 pt-8 pb-6">
              <div className="min-w-0">
                <p className="truncate text-[15px] text-ink">{email.to}</p>
                <h2 className="mt-1.5 text-[13px] leading-relaxed font-light text-muted">
                  {email.subject || <span className="italic text-faint">no subject</span>}
                </h2>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close details"
                className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-faint transition-colors hover:text-ink"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-7 pb-8">
              <div className="flex items-center gap-3 border-t border-ink/[0.09] py-4">
                <span className="label pt-0">Status</span>
                {status && <StatusBadge status={status} />}
              </div>

              <div className="mt-1">
                <Field label="Sent" value={formatDateTime(email.sentAt) ?? "—"} />

                {/* sent_at is null while a send has not happened yet, so show when the doc
                    was written instead of a bare dash */}
                {email.status === "pending" && (
                  <Field label="Created" value={formatDateTime(email.createdAt) ?? "—"} />
                )}

                {/* worker KV keeps the last hit; nothing records the first open yet */}
                <Field
                  label="First open"
                  value={
                    <span className="text-faint" title="Not stored by the current schema">
                      not recorded
                    </span>
                  }
                />

                <Field label="Last open" value={formatDateTime(email.seenAt) ?? "—"} />

                <Field
                  label="Tracking requests"
                  value={email.openCount > 0 ? String(email.openCount) : "—"}
                />
              </div>

              {error && (
                <div className="mt-7 border-t border-ink/[0.09] pt-5">
                  <span className="label">Error</span>
                  <p className="mt-2.5 font-mono text-[12px] leading-relaxed break-words text-[#a8736c]">
                    {error}
                  </p>
                </div>
              )}

              {/* plain sentence at the bottom, not a warning. the distinction is the whole
                  point of the feature so it is stated once and quietly */}
              <p className="mt-8 border-t border-ink/[0.07] pt-4 text-[11px] leading-relaxed text-muted">
                An open means the tracking image was requested. That is not proof the
                recipient personally read the email, a mail client or a link scanner can
                request it too.
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
