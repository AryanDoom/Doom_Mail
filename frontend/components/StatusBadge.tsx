import { statusMeta } from "@/lib/format";
import type { DisplayStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: DisplayStatus }) {
  const meta = statusMeta(status);

  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span aria-hidden="true" className={`h-[5px] w-[5px] rounded-full ${meta.dot}`} />
      <span className={`text-[12px] ${meta.text}`}>{meta.label}</span>
    </span>
  );
}