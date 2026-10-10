import type { Summary } from "@/lib/types";
import { formatPercent } from "@/lib/format";

export function Stats({ summary }: { summary: Summary }) {
  const breakdown = [
    { value: summary.sent, word: "sent" },
    { value: summary.opened, word: "opened" },
    { value: summary.unopened, word: "unopened" },
    { value: summary.failed, word: "failed" },
    { value: summary.pending, word: "pending" },
  ];

  return (
    <section aria-labelledby="stats-heading" className="animate-rise">
      <h2 id="stats-heading" className="label">
        Overview
      </h2>

      <div className="mt-4 flex items-baseline gap-2.5">
        <span className="text-[2.5rem] leading-none text-ink tabular-nums">{summary.total}</span>
        <span className="ml-1.5 text-[13px] text-muted">emails tracked</span>
      </div>

      <ul className="mt-4 flex flex-wrap items-baseline text-[13px]">
        {breakdown.map((item, i) => (
          <li key={item.word} className="flex items-baseline">
            {i > 0 && <span className="px-2.5 text-faint">&middot;</span>}
            <span className="text-ink tabular-nums">{item.value}</span>
            {" "}
            <span className="ml-1.5 text-muted">{item.word}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-baseline gap-4 border-t border-ink/[0.09] pt-4">
        <span className="label">Open rate</span>
        <span className="text-[1.375rem] leading-none text-ink tabular-nums">
          {formatPercent(summary.openRate)}
        </span>
      </div>
    </section>
  );
}
