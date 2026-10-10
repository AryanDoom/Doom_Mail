import Sankey, { type SankeyLinkInput, type SankeyNodeInput } from "@/components/Sankey";
import type { Summary } from "@/lib/types";

export default function TrackingSankey({ summary }: { summary: Summary }) {
  const nodes: SankeyNodeInput[] = [
    { id: "emails", label: "Emails", color: "#737373" },
    { id: "sent", label: "Sent", color: "#626262" },
    { id: "failed", label: "Failed", color: "#383838" },
    { id: "pending", label: "Pending", color: "#525252" },
    { id: "opened", label: "Opened", color: "#858585" },
    { id: "unopened", label: "Unopened", color: "#464646" },
  ];
  const links: SankeyLinkInput[] = [
    { source: "emails", target: "sent", value: summary.sent },
    { source: "emails", target: "failed", value: summary.failed },
    { source: "emails", target: "pending", value: summary.pending },
    { source: "sent", target: "opened", value: summary.opened },
    { source: "sent", target: "unopened", value: summary.unopened },
  ];

  return (
    <section aria-labelledby="flow-heading" className="border-b border-ink/[0.09] pb-4">
      <div className="flex items-baseline justify-between gap-4">
        <h1 id="flow-heading" className="text-[13px] text-label">
          Email flow
        </h1>
        <p className="text-[12px] text-muted">
          Live data · <span className="text-label">{summary.total} emails</span>
        </p>
      </div>

      <div className="mt-3">
        <Sankey
          nodes={nodes}
          links={links}
          height={380}
          nodePadding={24}
          ariaLabel="Email flow from recipients to sent, failed, pending, opened, and unopened emails"
        />
      </div>
    </section>
  );
}
