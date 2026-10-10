"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { sendEmail } from "@/lib/api";
import { sendingAccountLabel } from "@/lib/account";
import {
  EMPTY_DRAFT,
  discardDraft,
  hasErrors,
  loadDraft,
  storeDraft,
  validateForDraft,
  validateForSend,
  type Draft,
  type FieldErrors,
  type FieldName,
} from "@/lib/compose";

const LINE =
  "w-full border-b border-ink/[0.13] bg-transparent py-2.5 text-[15px] text-ink " +
  "placeholder:text-faint/70 transition-colors duration-200 " +
  "focus:border-ink/30 focus:outline-none";

const AREA =
  "w-full resize-y border border-ink/[0.13] bg-transparent p-4 text-[15px] leading-relaxed " +
  "text-ink placeholder:text-faint/70 transition-colors duration-200 " +
  "focus:border-ink/30 focus:outline-none";

const BUTTON =
  "inline-flex items-center justify-center rounded-sm border px-4 py-2.5 text-[13px] " +
  "transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-45";

const SAVE_BUTTON = `${BUTTON} border-ink/[0.13] text-muted hover:border-ink/25 hover:text-ink`;
const SEND_BUTTON = `${BUTTON} border-ink/[0.18] bg-ink/[0.07] text-ink hover:bg-ink/[0.12]`;

// reuse the status colors from lib/format.ts
const OK_TEXT = "text-[#8aa595]";
const ERROR_TEXT = "text-[#a8736c]";

type Notice = { kind: "ok" | "error"; text: string } | null;

export function ComposeForm() {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const errorId = useId();
  // stable ids keep the input error links from changing on each render
  const idFor = useCallback((field: FieldName) => `${errorId}-${field}`, [errorId]);

  const [attempted, setAttempted] = useState(false);
  const busy = sending || saving;

  const revalidate = useCallback(
    (mode: "send" | "draft") => {
      const next = mode === "send" ? validateForSend(draft) : validateForDraft(draft);
      setErrors(next);
      return next;
    },
    [draft],
  );

  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const stored = loadDraft();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring after mount is required, see above
    if (stored) setDraft(stored);
  }, []);

  const update = useCallback(
    (field: FieldName, value: string) => {
      const next = { ...draft, [field]: value };
      setDraft(next);
      if (attempted) setErrors(validateForSend(next));
    },
    [draft, attempted],
  );

  const handleSend = useCallback(async () => {
    if (busy) return;

    setAttempted(true);
    setNotice(null);

    const found = revalidate("send");
    if (hasErrors(found)) {
      setNotice({ kind: "error", text: "Fill in the fields marked above." });
      const first = (["to", "subject", "body"] as FieldName[]).find((field) => found[field]);
      document.getElementById(idFor(first ?? "to"))?.focus();
      return;
    }

    setSending(true);
    try {
      const result = await sendEmail(draft);

      if (result.ok) {
        setNotice({
          kind: "ok",
          text: `Sent to ${result.email.to}. It is on the dashboard now, tracking and all.`,
        });
        // clear only after the api confirms the send
        setDraft(EMPTY_DRAFT);
        setErrors({});
        discardDraft();
        return;
      }

      setNotice({ kind: "error", text: result.problem });
    } finally {
      setSending(false);
    }
  }, [busy, draft, revalidate, idFor]);

  const handleSave = useCallback(() => {
    if (busy) return;

    setAttempted(true);
    setNotice(null);

    const found = revalidate("draft");
    if (hasErrors(found)) {
      setNotice({ kind: "error", text: found.body ?? "Nothing to save yet." });
      return;
    }

    setSaving(true);
    try {
      const kept = storeDraft(draft);
      setNotice(
        kept
          ? { kind: "ok", text: "Draft saved in this browser." }
          : {
              kind: "error",
              text: "This browser would not store the draft. It is still here on screen.",
            },
      );
    } finally {
      setSaving(false);
    }
  }, [busy, draft, revalidate]);

  const errorFor = (field: FieldName) => (attempted ? errors[field] : undefined);

  return (
    <div className="animate-rise">
      {/* the account this would go out from. it is a readout, not a control, because there
          is no account switcher yet and a control that does nothing is worse than a label */}
      <div className="flex items-baseline gap-3 border-b border-ink/[0.09] pb-4">
        <span className="label">From</span>
        <span className="text-[13px] text-muted">{sendingAccountLabel()}</span>
      </div>

      <form
        noValidate
        onSubmit={(event) => {
          // the single path to a send. see the button below for why there is no onClick on it
          event.preventDefault();
          void handleSend();
        }}
        className="mt-8"
      >
        <Field
          label="To"
          htmlFor={idFor("to")}
          error={errorFor("to")}
          errorId={idFor("to") + "-msg"}
        >
          <input
            id={idFor("to")}
            type="email"
            name="to"
            autoComplete="off"
            spellCheck={false}
            value={draft.to}
            onChange={(event) => update("to", event.target.value)}
            placeholder="someone@example.com"
            aria-invalid={errorFor("to") ? true : undefined}
            aria-describedby={errorFor("to") ? idFor("to") + "-msg" : undefined}
            className={LINE}
          />
        </Field>

        <Field
          label="Subject"
          htmlFor={idFor("subject")}
          error={errorFor("subject")}
          errorId={idFor("subject") + "-msg"}
        >
          <input
            id={idFor("subject")}
            type="text"
            name="subject"
            value={draft.subject}
            onChange={(event) => update("subject", event.target.value)}
            placeholder="what this is about"
            aria-invalid={errorFor("subject") ? true : undefined}
            aria-describedby={errorFor("subject") ? idFor("subject") + "-msg" : undefined}
            className={LINE}
          />
        </Field>

        <Field
          label="Body"
          htmlFor={idFor("body")}
          error={errorFor("body")}
          errorId={idFor("body") + "-msg"}
        >
          <textarea
            id={idFor("body")}
            name="body"
            rows={6}
            value={draft.body}
            onChange={(event) => update("body", event.target.value)}
            placeholder="Plain text. Line breaks are kept as written."
            aria-invalid={errorFor("body") ? true : undefined}
            aria-describedby={errorFor("body") ? idFor("body") + "-msg" : undefined}
            className={AREA}
          />
        </Field>

        <p
          role="status"
          aria-live="polite"
          className={[
            "mt-6 min-h-[1.25rem] text-[13px]",
            notice === null ? "" : notice.kind === "ok" ? OK_TEXT : ERROR_TEXT,
          ].join(" ")}
        >
          {notice?.text ?? ""}
        </p>

        <div className="mt-4 -translate-y-[10px] flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            aria-busy={saving}
            className={SAVE_BUTTON}
          >
            {saving ? "Saving…" : "Save draft"}
          </button>

          <button type="submit" disabled={busy} aria-busy={sending} className={SEND_BUTTON}>
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  errorId: string;
  children: React.ReactNode;
}

function Field({ label, htmlFor, error, errorId, children }: FieldProps) {
  return (
    <div className="mb-8 last:mb-0">
      <label htmlFor={htmlFor} className="label block">
        {label}
      </label>

      <div className="mt-1">{children}</div>

      {/* reserved rather than conditional so appearing and disappearing a message does not
          shove the rest of the form down the page */}
      <p
        id={errorId}
        className={`mt-1.5 min-h-[1rem] text-[12px] ${error ? ERROR_TEXT : ""}`}
      >
        {error ?? ""}
      </p>
    </div>
  );
}
