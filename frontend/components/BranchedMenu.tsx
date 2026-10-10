'use client';

import Link from 'next/link';
import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import './BranchedMenu.css';

export interface BranchedMenuChild {
  value: string;
  label: string;
  icon?: ReactNode;
  /** when present the row renders as a real link instead of a button */
  href?: string;
}

export interface BranchedMenuItem {
  label: string;
  value?: string;
  icon?: ReactNode;
  href?: string;
  children?: BranchedMenuChild[];
}

export interface BranchedMenuProps {
  items?: BranchedMenuItem[];
  defaultOpen?: number | number[];
  defaultActive?: string;
  active?: string;
  onSelect?: (value: string, item: BranchedMenuChild | BranchedMenuItem) => void;
  onToggle?: (index: number, open: boolean) => void;
  color?: string;
  accentColor?: string;
  lineColor?: string;
  width?: number;
  rowHeight?: number;
  indent?: number;
  trunk?: number;
  radius?: number;
  lineWidth?: number;
  fontSize?: number;
  iconSize?: number;
  iconStrokeWidth?: number;
  drawDuration?: number;
  foldDuration?: number;
  className?: string;
}

const DEFAULT_ITEMS: BranchedMenuItem[] = [
  {
    label: 'Getting started',
    children: [
      { value: 'install', label: 'Installation' },
      { value: 'quick', label: 'Quick start' },
      { value: 'config', label: 'Configuration' },
      { value: 'theming', label: 'Theming' },
    ],
  },
  {
    label: 'Components',
    children: [
      { value: 'buttons', label: 'Buttons' },
      { value: 'typography', label: 'Typography' },
      { value: 'overlays', label: 'Overlays' },
      { value: 'toasts', label: 'Toasts' },
    ],
  },
];
const PAD = 6;
const MARK = 16;

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const renderIcon = (icon: ReactNode) => icon;

const toSet = (open: number | number[]) => new Set(Array.isArray(open) ? open : open >= 0 ? [open] : []);

const BranchedMenu: React.FC<BranchedMenuProps> = ({
  items = DEFAULT_ITEMS,
  defaultOpen = 0,
  defaultActive = '',
  active: activeProp,
  onSelect,
  onToggle,
  color = '#e9e8e4',
  accentColor = '#e9e8e4',
  lineColor = 'rgba(233, 231, 226, 0.13)',
  width = 248,
  rowHeight = 36,
  indent = 40,
  trunk = 14,
  radius = 10,
  lineWidth = 1.5,
  fontSize = 14,
  drawDuration = 400,
  foldDuration = 300,
  className = '',
}) => {
  const [uncontrolled, setUncontrolled] = useState(() => {
    if (defaultActive) return defaultActive;
    const first = items.find((it, i) => it.children && toSet(defaultOpen).has(i));
    return first?.children?.[0]?.value ?? '';
  });
  const active = activeProp ?? uncontrolled;

  const [intent, setIntent] = useState<Record<number, boolean>>(() => {
    const seed: Record<number, boolean> = {};
    toSet(defaultOpen).forEach(i => {
      seed[i] = true;
    });
    return seed;
  });

  const navRef = useRef<HTMLElement>(null);
  const heads = useRef<(HTMLButtonElement | null)[]>([]);
  const markerRef = useRef<HTMLSpanElement>(null);

  const latest = useRef<{ onSelect?: BranchedMenuProps['onSelect']; onToggle?: BranchedMenuProps['onToggle'] }>({});
  useEffect(() => {
    latest.current = { onSelect, onToggle };
  }, [onSelect, onToggle]);

  const groupedIndex = items.findIndex(it => it.children?.some(kid => kid.value === active));
  const leafIndex = items.findIndex(it => !it.children && (it.value ?? it.label) === active);
  const markerIndex = groupedIndex >= 0 ? groupedIndex : leafIndex;

  const sectionOpen = (i: number) => (i in intent ? intent[i] : i === groupedIndex);

  const markerShown = markerIndex >= 0 && (groupedIndex >= 0 ? sectionOpen(groupedIndex) : true);

  const select = (value: string, item: BranchedMenuChild | BranchedMenuItem) => {
    if (activeProp === undefined) setUncontrolled(value);
    latest.current.onSelect?.(value, item);
  };

  const toggle = (i: number) => {
    const isOpen = sectionOpen(i);
    setIntent(prev => ({ ...prev, [i]: !isOpen }));
    latest.current.onToggle?.(i, !isOpen);
  };

  useIsoLayoutEffect(() => {
    const place = (glide: boolean) => {
      const m = markerRef.current;
      const el = heads.current[markerIndex];
      if (!m) return;
      const on = markerShown && el;
      if (!glide) m.style.transition = 'none';
      if (on) m.style.top = `${el.offsetTop + (el.offsetHeight - MARK) / 2}px`;
      m.toggleAttribute('data-on', Boolean(on));
      if (!glide) {
        void m.offsetHeight;
        m.style.transition = '';
      }
    };
    place(true);
    let first = true;
    const ro = new ResizeObserver(() => {
      if (first) {
        first = false;
        return;
      }
      place(false);
    });
    if (navRef.current) ro.observe(navRef.current);
    return () => ro.disconnect();
  }, [markerIndex, markerShown, rowHeight, fontSize]);

  const r = Math.min(radius, rowHeight / 2 - 2);
  const endX = indent - 8;
  const rowY = (k: number) => PAD + k * rowHeight + rowHeight / 2;
  const branch = (k: number) => `M ${trunk} ${rowY(k) - r} A ${r} ${r} 0 0 0 ${trunk + r} ${rowY(k)} H ${endX}`;
  const reach = (k: number) => `M ${trunk} 0 V ${rowY(k) - r} A ${r} ${r} 0 0 0 ${trunk + r} ${rowY(k)} H ${endX}`;
  const length = (k: number) => rowY(k) - r + (Math.PI * r) / 2 + (endX - trunk - r);

  // shared by the leaf heads and the child rows so a link and a button are styled and
  // labelled identically
  return (
    <nav
      ref={navRef}
      aria-label="Sections"
      className={`branched-menu${className ? ` ${className}` : ''}`}
      style={
        {
          '--bm-w': `${width}px`,
          '--bm-ink': color,
          '--bm-accent': accentColor,
          '--bm-line': lineColor,
          '--bm-font': `${fontSize}px`,
          '--bm-row': `${rowHeight}px`,
          '--bm-indent': `${indent}px`,
          '--bm-line-w': lineWidth,
          '--bm-draw': `${drawDuration}ms`,
          '--bm-fold': `${foldDuration}ms`,
        } as CSSProperties
      }
    >
      <span ref={markerRef} className="branched-menu__marker" aria-hidden="true" />
      {items.map((item, i) => {
        const kids = item.children;
        const isOpen = kids ? sectionOpen(i) : false;
        const leafValue = item.value ?? item.label;
        const leafActive = !kids && leafValue === active;
        const bodyH = kids ? PAD * 2 + kids.length * rowHeight : 0;

        const headBody = (
          <>
            {item.icon ? (
                            <span className="branched-menu__icon" aria-hidden="true">
                              {renderIcon(item.icon)}
                            </span>
            ) : null}
            {item.label}
          </>
        );

        return (
          <div key={item.value ?? item.label} className="branched-menu__section" data-open={isOpen ? '' : undefined}>
            {item.href ? (
              <Link
                ref={el => {
                  heads.current[i] = el as unknown as HTMLButtonElement;
                }}
                href={item.href}
                aria-current={leafActive ? 'page' : undefined}
                data-active={leafActive ? '' : undefined}
                className="branched-menu__head"
                onClick={() => (kids ? toggle(i) : select(leafValue, item))}
              >
                {headBody}
              </Link>
            ) : (
              <button
                ref={el => {
                  heads.current[i] = el;
                }}
                type="button"
                className="branched-menu__head"
                aria-expanded={kids ? isOpen : undefined}
                aria-current={leafActive ? 'page' : undefined}
                data-active={leafActive ? '' : undefined}
                onClick={() => (kids ? toggle(i) : select(leafValue, item))}
              >
                {item.label}
              </button>
            )}
            {kids ? (
              <div className="branched-menu__body" inert={!isOpen}>
                <div className="branched-menu__fold">
                  <div className="branched-menu__tree" style={{ height: bodyH }}>
                    <svg className="branched-menu__lines" width={indent} height={bodyH} aria-hidden="true">
                      <path className="branched-menu__base" d={`M ${trunk} 0 V ${rowY(kids.length - 1) - r}`} />
                      {kids.map((kid, k) => (
                        <path key={kid.value} className="branched-menu__base" d={branch(k)} />
                      ))}
                      {kids.map((kid, k) => (
                        <path
                          key={kid.value}
                          className="branched-menu__reach"
                          d={reach(k)}
                          style={{
                            strokeDasharray: length(k),
                            strokeDashoffset: kid.value === active ? 0 : length(k),
                          }}
                        />
                      ))}
                    </svg>
                    {kids.map(kid => {
                      const on = kid.value === active;
                      const inner = (
                        <>
                          {kid.icon ? (
                            <span className="branched-menu__icon" aria-hidden="true">
                              {renderIcon(kid.icon)}
                            </span>
                          ) : null}
                          <span className="branched-menu__label">{kid.label}</span>
                        </>
                      );
                      return kid.href ? (
                        <Link
                          key={kid.value}
                          href={kid.href}
                          aria-current={on ? 'page' : undefined}
                          data-active={on ? '' : undefined}
                          tabIndex={isOpen ? 0 : -1}
                          className="branched-menu__item"
                          onClick={() => select(kid.value, kid)}
                        >
                          {inner}
                        </Link>
                      ) : (
                        <button
                          key={kid.value}
                          type="button"
                          className="branched-menu__item"
                          aria-current={on ? 'page' : undefined}
                          data-active={on ? '' : undefined}
                          tabIndex={isOpen ? 0 : -1}
                          onClick={() => select(kid.value, kid)}
                        >
                          {inner}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
};

export default BranchedMenu;
