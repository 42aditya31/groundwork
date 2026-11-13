"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  CircleCheckBig,
  FolderKanban,
  LayoutGrid,
  Library,
  LineChart,
  LogOut,
  Map as MapIcon,
  Menu,
  Moon,
  Settings,
  Sun,
  SunMoon,
  BadgeCheck,
  X,
} from "lucide-react";
import { logout } from "@/server/actions/auth";
import { BrandMark, cx } from "@/components/ui";
import { SessionTimer, type TimerInfo } from "./session-timer";
import { THEME_KEY, applyTheme, usePersistentState, type ThemeChoice } from "@/lib/persistent";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutGrid },
  { href: "/today", label: "Today", icon: CircleCheckBig },
  { href: "/roadmap", label: "Roadmap", icon: MapIcon },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/proof", label: "Proof of work", icon: BadgeCheck },
  { href: "/resources", label: "Resources", icon: Library },
  { href: "/progress", label: "Progress", icon: LineChart },
];
const MOBILE_TABS = ["/", "/today", "/roadmap", "/projects"];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav({ user, timer }: { user: { name: string; role: string }; timer: TimerInfo | null }) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = sheetRef.current;
    if (!d) return;
    if (sheetOpen && !d.open) d.showModal();
    if (!sheetOpen && d.open) d.close();
  }, [sheetOpen]);

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);

  return (
    <>
      <a href="#main" className="sr-only z-50 rounded bg-ink px-3 py-2 text-bg focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface/60 px-4 py-6 lg:flex">
        <Link href="/" className="flex items-center gap-2.5 px-2 text-ink">
          <BrandMark className="size-6" />
          <span className="text-[17px] font-semibold tracking-tight">Groundwork</span>
        </Link>
        <div className="mt-7 flex items-center gap-3 px-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-path-fill text-[13px] font-semibold text-fill-ink">{initials}</span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{user.name}</div>
            <div className="truncate text-[12.5px] text-ink-3">{user.role}</div>
          </div>
        </div>
        {timer && (
          <div className="mt-5">
            <SessionTimer timer={timer} />
          </div>
        )}
        <nav aria-label="Main" className="mt-6 flex flex-1 flex-col gap-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "group flex h-9 items-center gap-3 rounded-lg px-2.5 text-[14px] transition-colors",
                  active ? "bg-surface-2 font-medium text-ink" : "text-ink-2 hover:bg-surface-2/70 hover:text-ink",
                )}
              >
                <Icon className={cx("size-4.5", active ? "text-accent" : "text-ink-3 group-hover:text-ink-2")} strokeWidth={1.75} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-col gap-0.5 border-t border-line pt-3">
          <Link
            href="/settings"
            aria-current={isActive(pathname, "/settings") ? "page" : undefined}
            className={cx("flex h-9 items-center gap-3 rounded-lg px-2.5 text-[14px] text-ink-2 hover:bg-surface-2/70 hover:text-ink", isActive(pathname, "/settings") && "bg-surface-2 text-ink")}
          >
            <Settings className="size-4.5 text-ink-3" strokeWidth={1.75} />
            Settings
          </Link>
          <ThemeSwitch />
          <form action={logout}>
            <button type="submit" className="flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-[14px] text-ink-2 hover:bg-surface-2/70 hover:text-ink">
              <LogOut className="size-4.5 text-ink-3" strokeWidth={1.75} />
              Log out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-bg/90 px-4 backdrop-blur lg:hidden">
        <Link href="/" className="flex items-center gap-2 text-ink">
          <BrandMark className="size-6" />
          <span className="font-semibold tracking-tight">Groundwork</span>
        </Link>
        {timer ? <SessionTimer timer={timer} compact /> : <span className="flex size-8 items-center justify-center rounded-full bg-path-fill text-xs font-semibold text-fill-ink">{initials}</span>}
      </header>

      {/* Mobile tab bar */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {NAV.filter((n) => MOBILE_TABS.includes(n.href)).map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cx("flex h-16 flex-col items-center justify-center gap-1 text-[11px]", active ? "text-ink" : "text-ink-3")}>
                <Icon className={cx("size-5", active && "text-accent")} strokeWidth={active ? 2 : 1.75} />
                {label}
              </Link>
            );
          })}
          <button type="button" onClick={() => setSheetOpen(true)} className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] text-ink-3" aria-haspopup="dialog">
            <Menu className="size-5" strokeWidth={1.75} />
            More
          </button>
        </div>
      </nav>

      <dialog
        ref={sheetRef}
        onClose={() => setSheetOpen(false)}
        onClick={(e) => e.target === sheetRef.current && setSheetOpen(false)}
        aria-label="More navigation"
        className="fixed inset-x-0 top-auto bottom-0 m-0 w-full max-w-none rounded-t-2xl border border-line bg-surface p-0 text-ink shadow-pop lg:hidden"
      >
        <div className="px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">{user.name}</div>
              <div className="text-[12.5px] text-ink-3">{user.role}</div>
            </div>
            <button type="button" onClick={() => setSheetOpen(false)} aria-label="Close" className="rounded-lg p-2 text-ink-3 hover:bg-surface-2">
              <X className="size-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1">
            {[...NAV.filter((n) => !MOBILE_TABS.includes(n.href)), { href: "/settings", label: "Settings", icon: Settings }].map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} onClick={() => setSheetOpen(false)} className={cx("flex h-12 items-center gap-3 rounded-lg px-3 text-[15px]", isActive(pathname, href) ? "bg-surface-2 font-medium" : "hover:bg-surface-2")}>
                <Icon className="size-5 text-ink-3" strokeWidth={1.75} />
                {label}
              </Link>
            ))}
          </div>
          <div className="mt-2 border-t border-line pt-2">
            <ThemeSwitch />
            <form action={logout}>
              <button type="submit" className="flex h-11 w-full items-center gap-3 rounded-lg px-3 text-[15px] hover:bg-surface-2">
                <LogOut className="size-5 text-ink-3" strokeWidth={1.75} />
                Log out
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}

function ThemeSwitch() {
  // Saved on this device in localStorage; the inline script in the root layout applies it before paint.
  const [theme, setThemeChoice] = usePersistentState<ThemeChoice>(THEME_KEY, "system");
  const next: ThemeChoice = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : SunMoon;
  const label = theme === "light" ? "Light theme" : theme === "dark" ? "Dark theme" : "System theme";
  return (
    <button
      type="button"
      onClick={() => {
        setThemeChoice(next);
        applyTheme(next);
      }}
      className="flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-[14px] text-ink-2 hover:bg-surface-2/70 hover:text-ink max-lg:h-11 max-lg:px-3 max-lg:text-[15px]"
      title={`Switch to ${next} theme`}
    >
      <Icon className="size-4.5 text-ink-3" strokeWidth={1.75} />
      {label}
    </button>
  );
}
