"use client";

import BranchedMenu, { type BranchedMenuItem } from "./BranchedMenu";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const iconStroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.25,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// module scope on purpose. built inside the component this array is a new reference on
// every render, which would tear down and rebuild the menu's ResizeObserver each time
const MENU: BranchedMenuItem[] = [
  {
    label: "Tracking",
    children: [
      { value: "/", label: "Dashboard", href: "/" },
      { value: "/emails", label: "Emails", href: "/emails" },
    ],
  },
  {
    label: "Outreach",
    children: [
      { value: "/compose", label: "Compose", href: "/compose" },
      { value: "/contacts", label: "Contacts", href: "/contacts" },
      { value: "/campaigns", label: "Campaigns", href: "/campaigns" },
    ],
  },
  {
    label: "System",
    children: [{ value: "/settings", label: "Settings", href: "/settings" }],
  },
];

const ROUTES = new Set(MENU.flatMap((section) => section.children?.map((kid) => kid.value) ?? []));

export function Sidebar() {
  const pathname = usePathname();
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;

  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const openDrawer = useCallback(() => setOpenedAt(pathname), [pathname]);
  const closeDrawer = useCallback(() => setOpenedAt(null), []);
  const toggleDrawer = useCallback(
    () => setOpenedAt((current) => (current === pathname ? null : pathname)),
    [pathname],
  );

  // a short delay keeps the drawer open while the pointer crosses the gap
  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpenedAt(null), 320);
  }, [cancelClose]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenedAt(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => () => cancelClose(), [cancelClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const active = ROUTES.has(pathname) ? pathname : "";

  return (
    <>
      <button
        type="button"
        aria-label="Open navigation"
        aria-expanded={open}
        onMouseEnter={() => {
          cancelClose();
          openDrawer();
        }}
        onMouseLeave={scheduleClose}
        onFocus={openDrawer}
        onClick={toggleDrawer}
        className="fixed left-0 top-0 z-40 hidden h-screen w-5 cursor-pointer md:block"
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-px bg-ink/[0.06] transition-colors duration-300 hover:bg-ink/[0.14]"
        />
      </button>

      {/* small menu button, touch devices have no hover so the edge strip is not an option */}
      <button
        type="button"
        aria-label="Open navigation"
        aria-expanded={open}
        onClick={toggleDrawer}
        className="fixed left-4 top-4 z-40 flex h-8 w-8 items-center justify-center rounded-sm text-muted transition-colors hover:text-ink md:hidden"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" {...iconStroke} aria-hidden="true">
          <path d="M2 4.5h12M2 8h12M2 11.5h12" />
        </svg>
      </button>

      {/* tap target for dismissing on touch, only ever visible with the drawer open on
          mobile. flat black, no blur, the drawer behind it is opaque anyway */}
      <div
        aria-hidden="true"
        onClick={closeDrawer}
        className={[
          "fixed inset-0 z-40 bg-black/70 transition-opacity duration-300 md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
      />

      <aside
        aria-label="Navigation"
        // inert while shut so the links leave the tab order, the edge button is the way in
        inert={!open}
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
        className={[
          "fixed left-0 top-0 z-50 flex h-screen w-[272px] flex-col",
          "border-r border-ink/[0.08] bg-shell",
          "transition-[transform,opacity] duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "translate-x-0 opacity-100" : "pointer-events-none -translate-x-full opacity-0",
        ].join(" ")}
      >
        <div className="px-7 pt-8 pb-7">
        </div>

        <nav className="flex-1 overflow-y-auto px-6 pt-1">
          <BranchedMenu
            items={MENU}
            active={active}
            defaultOpen={[]}
            onSelect={closeDrawer}
            color="#e9e8e4"
            accentColor="#e9e8e4"
            lineColor="rgba(233, 231, 226, 0.13)"
            width={248}
            rowHeight={38}
            indent={42}
            trunk={16}
            radius={10}
            lineWidth={1.5}
            fontSize={14}
            iconSize={16}
            iconStrokeWidth={1.25}
            drawDuration={420}
            foldDuration={280}
          />
        </nav>
      </aside>
    </>
  );
}
