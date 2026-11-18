"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface SectionNavItem {
  id: string;
  label: string;
}

/** Gap kept between the bottom of the navigation and the section that counts as "current". */
const READING_LINE_GAP = 24;
/** After a click the chosen tab stays highlighted while the page scrolls to it. */
const CLICK_LOCK_MS = 900;

/**
 * In-page navigation, sticky under the site header (4rem).
 *
 * Sticky positioning only works inside the parent that contains it: render this as a direct child of the
 * element that spans every section (the page's <article>), never inside a wrapper that is only as tall as
 * the navigation itself, or it has nowhere to stick.
 *
 * Plain anchors (work without scripting, keyboard and screen-reader friendly). A scroll-position spy only adds
 * `aria-current`: the current section is the last one whose top has passed the reading line under the
 * navigation, and the last section once the page is scrolled to its end. On narrow screens the strip scrolls
 * horizontally rather than wrapping, keeps the active tab in view, and shows a fade where more tabs are hidden.
 * Pass only sections that exist, in document order.
 */
export function SectionNav({
  items,
  className,
}: {
  items: SectionNavItem[];
  className?: string;
}) {
  const ids = items.map((i) => i.id).join("|");
  const [active, setActive] = useState<string | null>(items[0]?.id ?? null);
  const [edges, setEdges] = useState({ start: false, end: false });
  const navRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const lockUntil = useRef(0);

  useEffect(() => {
    const order = ids ? ids.split("|") : [];
    let frame = 0;
    let timer = 0;
    const update = () => {
      frame = 0;
      const nav = navRef.current;
      if (!nav || order.length === 0) return;
      const locked = lockUntil.current - Date.now();
      if (locked > 0) {
        // a click just chose a tab: leave it while the page scrolls there, then look again (no scroll event may follow)
        window.clearTimeout(timer);
        timer = window.setTimeout(schedule, locked + 20);
        return;
      }
      const line = nav.getBoundingClientRect().bottom + READING_LINE_GAP;
      const atEnd =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;
      let current = order[0];
      for (const id of order) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= line) current = id;
        else break;
      }
      setActive(atEnd ? order[order.length - 1] : current);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [ids]);

  const measureEdges = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const start = list.scrollLeft > 2;
    const end = list.scrollLeft + list.clientWidth < list.scrollWidth - 2;
    setEdges((e) => (e.start === start && e.end === end ? e : { start, end }));
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    measureEdges();
    list.addEventListener("scroll", measureEdges, { passive: true });
    window.addEventListener("resize", measureEdges);
    return () => {
      list.removeEventListener("scroll", measureEdges);
      window.removeEventListener("resize", measureEdges);
    };
  }, [ids, measureEdges]);

  // keep the active tab inside the visible part of the strip (horizontal only: the page itself is never moved)
  useEffect(() => {
    const list = listRef.current;
    const link = list?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!list || !link) return;
    const strip = list.getBoundingClientRect();
    const tab = link.getBoundingClientRect();
    if (tab.left >= strip.left + 8 && tab.right <= strip.right - 8) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    list.scrollTo({
      left: Math.max(
        0,
        list.scrollLeft +
          (tab.left - strip.left) -
          (strip.width - tab.width) / 2,
      ),
      behavior: reduce ? "auto" : "smooth",
    });
  }, [active]);

  return (
    <nav
      ref={navRef}
      aria-label="On this page"
      className={cn(
        "sticky top-16 z-30 border-b border-border bg-background/95 backdrop-blur",
        className,
      )}
    >
      <div className="relative page-container">
        <ul
          ref={listRef}
          className="flex [scrollbar-width:none] gap-1 overflow-x-auto py-1 [&::-webkit-scrollbar]:hidden"
        >
          {items.map((i) => (
            <li key={i.id} className="shrink-0">
              <a
                href={`#${i.id}`}
                aria-current={active === i.id ? "location" : undefined}
                onClick={() => {
                  setActive(i.id);
                  lockUntil.current = Date.now() + CLICK_LOCK_MS;
                }}
                className={cn(
                  "relative flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-hover hover:text-foreground",
                  active === i.id &&
                    "bg-primary-soft text-primary-soft-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary",
                )}
              >
                {i.label}
              </a>
            </li>
          ))}
        </ul>
        <span
          aria-hidden
          data-edge="start"
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 w-8 bg-linear-to-r from-background to-transparent transition-opacity",
            edges.start ? "opacity-100" : "opacity-0",
          )}
        />
        <span
          aria-hidden
          data-edge="end"
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l from-background to-transparent transition-opacity",
            edges.end ? "opacity-100" : "opacity-0",
          )}
        />
      </div>
    </nav>
  );
}
