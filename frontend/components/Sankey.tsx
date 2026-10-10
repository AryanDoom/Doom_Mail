"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

export type SankeyNodeInput = {
  id: string;
  label?: string;
  /** css colour for this node */
  color?: string;
};

export type SankeyLinkInput = {
  source: string;
  target: string;
  value: number;
};

export type SankeyProps = {
  nodes: SankeyNodeInput[];
  links: SankeyLinkInput[];
  height?: number;
  nodeWidth?: number;
  nodePadding?: number;
  formatValue?: (n: number) => string;
  ariaLabel?: string;
  className?: string;
};

type LNode = SankeyNodeInput & {
  color: string;
  layer: number;
  value: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  out: LLink[];
  in: LLink[];
};

type LLink = {
  index: number;
  source: LNode;
  target: LNode;
  value: number;
  width: number;
  sy: number; // y where the link leaves the source (top edge)
  ty: number; // y where the link enters the target (top edge)
};

type Hover = { kind: "node"; id: string } | { kind: "link"; index: number } | null;

const PALETTE = [
  "#a3a3a3",
  "#737373",
  "#525252",
  "#bdbdbd",
  "#8a8a8a",
  "#404040",
  "#666666",
  "#d4d4d4",
];

type Margin = { top: number; right: number; bottom: number; left: number };

function computeLayout(
  nodesIn: SankeyNodeInput[],
  linksIn: SankeyLinkInput[],
  width: number,
  height: number,
  margin: Margin,
  nodeWidth: number,
  pad: number,
) {
  const byId = new Map<string, LNode>();
  nodesIn.forEach((n) =>
    byId.set(n.id, {
      ...n,
      color: n.color ?? "",
      layer: 0,
      value: 0,
      x0: 0,
      x1: 0,
      y0: 0,
      y1: 0,
      out: [],
      in: [],
    }),
  );

  const links: LLink[] = [];
  linksIn.forEach((l) => {
    const s = byId.get(l.source);
    const t = byId.get(l.target);
    if (!s || !t || s === t || !(l.value > 0)) return;
    const link: LLink = {
      index: links.length,
      source: s,
      target: t,
      value: l.value,
      width: 0,
      sy: 0,
      ty: 0,
    };
    links.push(link);
    s.out.push(link);
    t.in.push(link);
  });

  const nodes = [...byId.values()].filter((n) => n.in.length + n.out.length > 0);
  const sum = (ls: LLink[]) => ls.reduce((a, l) => a + l.value, 0);
  nodes.forEach((n) => (n.value = Math.max(sum(n.in), sum(n.out))));

  // longest source path sets each node's layer
  const indeg = new Map(nodes.map((n) => [n, n.in.length] as const));
  const queue = nodes.filter((n) => n.in.length === 0);
  let seen = 0;
  while (queue.length) {
    const n = queue.shift()!;
    seen++;
    for (const l of n.out) {
      l.target.layer = Math.max(l.target.layer, n.layer + 1);
      const d = indeg.get(l.target)! - 1;
      indeg.set(l.target, d);
      if (d === 0) queue.push(l.target);
    }
  }
  if (seen < nodes.length) throw new Error("Sankey links contain a cycle.");

  const maxLayer = Math.max(0, ...nodes.map((n) => n.layer));
  nodes.forEach((n) => {
    if (n.out.length === 0) n.layer = maxLayer; // push sinks to the last column
  });

  [...nodes]
    .sort((a, b) => a.layer - b.layer)
    .forEach((n, i) => {
      if (!n.color) n.color = n.in[0]?.source.color || PALETTE[i % PALETTE.length];
    });

  const innerW = Math.max(0, width - margin.left - margin.right);
  const kx = maxLayer === 0 ? 0 : (innerW - nodeWidth) / maxLayer;
  nodes.forEach((n) => {
    n.x0 = margin.left + n.layer * kx;
    n.x1 = n.x0 + nodeWidth;
  });

  const columns: LNode[][] = Array.from({ length: maxLayer + 1 }, () => []);
  nodes.forEach((n) => columns[n.layer].push(n));
  const innerH = Math.max(0, height - margin.top - margin.bottom);
  const ky = Math.max(
    0,
    Math.min(
      ...columns
        .filter((c) => c.length)
        .map((c) => (innerH - (c.length - 1) * pad) / c.reduce((a, n) => a + n.value, 0)),
    ),
  );

  columns.forEach((col) => {
    const total = col.reduce((a, n) => a + n.value * ky, 0) + (col.length - 1) * pad;
    let y = margin.top + (innerH - total) / 2;
    col.forEach((n) => {
      n.y0 = y;
      n.y1 = y + n.value * ky;
      y = n.y1 + pad;
    });
  });

  const centre = (n: LNode) => (n.y0 + n.y1) / 2;
  const top = margin.top;
  const bottom = margin.top + innerH;

  const resolve = (col: LNode[]) => {
    col.sort((a, b) => a.y0 - b.y0);
    let y = top;
    for (const n of col) {
      const dy = Math.max(0, y - n.y0);
      n.y0 += dy;
      n.y1 += dy;
      y = n.y1 + pad;
    }
    const last = col[col.length - 1];
    const overflow = last ? last.y1 - bottom : 0;
    if (overflow > 0) {
      last.y0 -= overflow;
      last.y1 -= overflow;
      let yy = last.y0;
      for (let i = col.length - 2; i >= 0; i--) {
        const dy = col[i].y1 + pad - yy;
        if (dy > 0) {
          col[i].y0 -= dy;
          col[i].y1 -= dy;
        }
        yy = col[i].y0;
      }
    }
  };

  const pull = (n: LNode, ls: LLink[], pick: (l: LLink) => LNode) => {
    const w = sum(ls);
    if (!w) return;
    const target = ls.reduce((a, l) => a + centre(pick(l)) * l.value, 0) / w;
    const dy = (target - centre(n)) * 0.8;
    n.y0 += dy;
    n.y1 += dy;
  };

  for (let it = 0; it < 8; it++) {
    for (let c = 1; c <= maxLayer; c++) {
      columns[c].forEach((n) => pull(n, n.in, (l) => l.source));
      resolve(columns[c]);
    }
    for (let c = maxLayer - 1; c >= 0; c--) {
      columns[c].forEach((n) => pull(n, n.out, (l) => l.target));
      resolve(columns[c]);
    }
  }

  links.forEach((l) => (l.width = l.value * ky));
  nodes.forEach((n) => {
    n.out.sort((a, b) => centre(a.target) - centre(b.target));
    let y = n.y0;
    n.out.forEach((l) => {
      l.sy = y;
      y += l.width;
    });
    n.in.sort((a, b) => centre(a.source) - centre(b.source));
    y = n.y0;
    n.in.forEach((l) => {
      l.ty = y;
      y += l.width;
    });
  });

  return { nodes, links, maxLayer };
}

export default function Sankey({
  nodes,
  links,
  height = 480,
  nodeWidth = 14,
  nodePadding = 14,
  formatValue = (n) => n.toLocaleString(),
  ariaLabel = "Sankey diagram",
  className = "",
}: SankeyProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<Hover>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const uid = useId().replace(/:/g, "");

  const enter = (event: ReactPointerEvent<SVGElement>, next: Hover) => {
    setHover(next);
    const r = wrapRef.current?.getBoundingClientRect();
    if (r) setPos({ x: event.clientX - r.left, y: event.clientY - r.top });
  };

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const compact = width < 560;
  const margin: Margin = compact
    ? { top: 8, right: 8, bottom: 8, left: 8 }
    : { top: 8, right: 150, bottom: 8, left: 130 };

  const result = useMemo(() => {
    if (!width) return null;
    try {
      return {
        ok: true as const,
        ...computeLayout(nodes, links, width, height, margin, nodeWidth, nodePadding),
      };
    } catch (e) {
      return { ok: false as const, message: (e as Error).message };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, links, width, height, nodeWidth, nodePadding, compact]);

  const isActive = (l: LLink) =>
    hover?.kind === "node"
      ? l.source.id === hover.id || l.target.id === hover.id
      : hover?.kind === "link"
        ? l.index === hover.index
        : false;

  const tooltip = (() => {
    if (!result || !result.ok || !hover) return null;
    if (hover.kind === "node") {
      const n = result.nodes.find((x) => x.id === hover.id);
      return n ? { title: n.label ?? n.id, detail: formatValue(n.value) } : null;
    }
    const l = result.links[hover.index];
    if (!l) return null;
    const share = Math.round((l.value / l.source.value) * 100);
    return {
      title: `${l.source.label ?? l.source.id} → ${l.target.label ?? l.target.id}`,
      detail: `${formatValue(l.value)} · ${share}% of ${l.source.label ?? l.source.id}`,
    };
  })();

  return (
    <div
      ref={wrapRef}
      className={`relative w-full ${className}`}
    >
      {result && !result.ok && (
        <p role="alert" className="text-sm text-[#a09c95]">
          {result.message}
        </p>
      )}

      {result && result.ok && (
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={ariaLabel}
          className="block overflow-visible"
        >
          <defs>
            {result.links.map((l) => (
              <linearGradient
                key={l.index}
                id={`${uid}-g${l.index}`}
                gradientUnits="userSpaceOnUse"
                x1={l.source.x1}
                x2={l.target.x0}
                y1={0}
                y2={0}
              >
                <stop offset="0%" stopColor={l.source.color} />
                <stop offset="100%" stopColor={l.target.color} />
              </linearGradient>
            ))}
          </defs>

          {/* Links */}
          <g fill="none">
            {result.links.map((l) => {
              const x0 = l.source.x1;
              const x1 = l.target.x0;
              const y0 = l.sy + l.width / 2;
              const y1 = l.ty + l.width / 2;
              const xm = (x0 + x1) / 2;
              const active = isActive(l);
              const dimmed = hover !== null && !active;
              return (
                <path
                  key={l.index}
                  d={`M${x0},${y0} C${xm},${y0} ${xm},${y1} ${x1},${y1}`}
                  stroke={`url(#${uid}-g${l.index})`}
                  strokeWidth={Math.max(l.width, 1)}
                  pointerEvents="stroke"
                  className={`transition-opacity duration-150 motion-reduce:transition-none ${
                    active ? "opacity-45" : dimmed ? "opacity-10" : "opacity-35"
                  }`}
                  onPointerEnter={(event) => enter(event, { kind: "link", index: l.index })}
                  onPointerLeave={() => setHover(null)}
                />
              );
            })}
          </g>

          {/* Nodes + labels */}
          {result.nodes.map((n) => {
            const h = n.y1 - n.y0;
            const cy = (n.y0 + n.y1) / 2;
            const name = n.label ?? n.id;

            const labelRight = compact
              ? n.layer <= result.maxLayer / 2
              : n.layer !== 0;
            const lx = labelRight ? n.x1 + 8 : n.x0 - 8;
            const anchor = labelRight ? "start" : "end";
            const twoLines = h >= 30;

            return (
              <g key={n.id}>
                <rect
                  x={n.x0}
                  y={n.y0}
                  width={n.x1 - n.x0}
                  height={Math.max(h, 1)}
                  rx={2}
                  fill={n.color}
                  tabIndex={0}
                  aria-label={`${name}: ${formatValue(n.value)}`}
                  className="cursor-pointer outline-none focus-visible:stroke-[#8a8a8a] focus-visible:stroke-2"
                  onPointerEnter={(event) => enter(event, { kind: "node", id: n.id })}
                  onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover({ kind: "node", id: n.id })}
                  onBlur={() => setHover(null)}
                />
                <text
                  x={lx}
                  y={twoLines ? cy - 7 : cy}
                  textAnchor={anchor}
                  dominantBaseline="middle"
                  paintOrder="stroke"
                  strokeLinejoin="round"
                  className="pointer-events-none fill-[#b0b0b0] stroke-[#090909] stroke-[3px] text-[12px] font-medium"
                >
                  {name}
                </text>
                {twoLines && (
                  <text
                    x={lx}
                    y={cy + 8}
                    textAnchor={anchor}
                    dominantBaseline="middle"
                    paintOrder="stroke"
                    strokeLinejoin="round"
                    className="pointer-events-none fill-[#a09c95] stroke-[#090909] stroke-[3px] text-[11px] tabular-nums"
                  >
                    {formatValue(n.value)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}

      {tooltip && (
        <div
          role="status"
          className="pointer-events-none absolute z-10 max-w-xs rounded-md border border-white/10 bg-[#090909] px-3 py-2 text-xs text-[#b0b0b0] shadow-lg"
          style={{
            left: Math.min(pos.x + 14, Math.max(0, width - 220)),
            top: pos.y + 14,
          }}
        >
          <div className="font-medium">{tooltip.title}</div>
          <div className="tabular-nums text-[#a09c95]">{tooltip.detail}</div>
        </div>
      )}
    </div>
  );
}
