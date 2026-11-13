import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/ui";
import { DEADLINE, dateRange, daysBetween, isWeekend, todayIn } from "@/lib/dates";
import { getSessionUser } from "@/server/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/");
  const today = todayIn("UTC");
  const daysLeft = Math.max(0, daysBetween(today, DEADLINE));
  const days = today <= DEADLINE ? dateRange(today, DEADLINE) : [];

  return (
    <main className="grid min-h-dvh bg-bg lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {/* Brand panel: fixed graphite colours so it reads the same in light and dark themes */}
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-[#26262b] bg-[#111113] p-12 text-[#fafafa] lg:flex xl:p-16">
        <div className="flex items-center gap-2.5">
          <BrandMark className="size-7 text-[#fafafa]" />
          <span className="text-lg font-semibold tracking-tight">Groundwork</span>
        </div>

        <div className="max-w-lg">
          <p className="font-serif text-[2.6rem] leading-[1.1] tracking-[-0.015em]">Build the foundation. Prove every skill with real work.</p>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-[#a1a1aa]">
            A focused plan for two AI-native careers: every topic tracked, every mastery claim backed by evidence.
          </p>
        </div>

        <div>
          <div className="mb-3 flex items-baseline justify-between text-[13px]">
            <span className="text-[#d4d4d8]">
              <span className="font-semibold text-[#fafafa]">{daysLeft} days</span> until December 31, 2026
            </span>
            <span className="text-[#71717a]">Weekends are project days</span>
          </div>
          <div className="flex h-20 items-end gap-[3px]" aria-hidden="true">
            {days.map((d, i) => (
              <div
                key={d}
                className="flex-1 rounded-t-[3px]"
                style={{
                  height: `${isWeekend(d) ? 92 : 58 + ((i * 37) % 23)}%`,
                  background: i === 0 ? "#10b981" : isWeekend(d) ? "#3f3f46" : "#27272a",
                }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[12px] text-[#71717a]" aria-hidden="true">
            <span>Today</span>
            <span>Dec 31</span>
          </div>
        </div>
      </section>

      {/* Sign-in */}
      <section className="flex flex-col px-5 py-10 sm:px-10">
        <div className="flex items-center gap-2.5 text-ink lg:hidden">
          <BrandMark className="size-7" />
          <span className="text-lg font-semibold tracking-tight">Groundwork</span>
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[380px]">
            <h1 className="text-[1.75rem] font-semibold tracking-[-0.02em] text-ink">Sign in</h1>
            <p className="mt-2 text-[15px] text-ink-2">Continue your learning plan where you left off.</p>
            <div className="mt-8 rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:p-7">
              <LoginForm />
            </div>
            <p className="mt-6 text-center text-[13px] text-ink-3">A private workspace. Your progress is saved to your account and stays signed in on this device.</p>
          </div>
        </div>
        <p className="text-center text-[12.5px] text-ink-3 lg:hidden">{daysLeft} days until December 31, 2026</p>
      </section>
    </main>
  );
}
