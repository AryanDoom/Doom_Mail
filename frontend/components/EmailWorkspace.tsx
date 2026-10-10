"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Stats } from "./Stats";
import { EmailList } from "./EmailList";
import { EmailDetails } from "./EmailDetails";
import TrackingSankey from "@/components/page";
import { loadEmails, type DataSource } from "@/lib/api";
import { summarise, byNewest } from "@/lib/summary";
import type { Email } from "@/lib/types";

export function EmailWorkspace({ limit }: { limit?: number }) {
  const [emails, setEmails] = useState<Email[] | null>(null);
  const [source, setSource] = useState<DataSource>("api");
  const [problem, setProblem] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let live = true;

    const refresh = () => loadEmails().then((result) => {
      if (!live) return;
      setEmails(result.emails);
      setSource(result.source);
      setProblem(result.problem);
    });

    void refresh();
    const interval = window.setInterval(() => void refresh(), 10000);
    window.addEventListener("focus", refresh);

    return () => {
      live = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const summary = useMemo(() => summarise(emails ?? []), [emails]);
  const rows = useMemo(
    () => (limit && emails ? [...emails].sort(byNewest).slice(0, limit) : emails),
    [emails, limit],
  );

  const selected = useMemo(
    () => emails?.find((email) => email.id === selectedId) ?? null,
    [emails, selectedId],
  );

  const close = useCallback(() => setSelectedId(null), []);

  const emptyNote = useMemo(() => {
    if (emails === null || emails.length > 0) return null;
    if (source === "error") return `Could not reach the API. ${problem ?? ""}`.trim();
    return null;
  }, [emails, source, problem]);

  return (
    <>
      {limit && <TrackingSankey summary={summary} />}
      <Stats summary={summary} />

      <section aria-labelledby="emails-heading" className="mt-12 md:mt-14">
        <div className="flex items-baseline justify-between gap-4 pb-4">
          <h2 id="emails-heading" className="label">
            Emails
          </h2>
          {limit && emails && emails.length > limit && (
            <Link
              href="/emails"
              className="text-[12px] text-muted transition-colors hover:text-ink"
            >
              All {emails.length}
            </Link>
          )}
        </div>

        <EmailList
          emails={rows ?? []}
          selectedId={selectedId}
          onSelect={(email) => setSelectedId(email.id)}
          loading={emails === null}
          emptyNote={emptyNote}
        />
      </section>

      <EmailDetails email={selected} onClose={close} />
    </>
  );
}
