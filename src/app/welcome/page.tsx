import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db, t } from "@/db";
import { BrandMark } from "@/components/ui";
import { DEADLINE, dateRange, isWeekend, todayIn } from "@/lib/dates";
import { requireUser } from "@/server/auth";
import { getPath } from "@/server/data";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Set up your plan" };

export default async function WelcomePage() {
  const user = await requireUser();
  const path = getPath(user.pathId);
  const topics = db.select().from(t.topics).where(eq(t.topics.pathId, user.pathId)).all();
  const domains = db.select().from(t.domains).where(eq(t.domains.pathId, user.pathId)).all();
  const special = new Set(domains.filter((d) => d.isSpecialization).map((d) => d.id));
  const essentialMinutes = topics.filter((x) => x.tier === "essential" && !special.has(x.domainId)).reduce((n, x) => n + x.estMinutes, 0);
  const allMinutes = topics.reduce((n, x) => n + x.estMinutes, 0);
  const today = todayIn(user.timezone);
  const days = dateRange(today, DEADLINE);
  const weekdays = days.filter((d) => !isWeekend(d)).length;
  const weekendDays = days.length - weekdays;
  const firstName = user.name.split(" ")[0];

  return (
    <main data-path={user.pathId} className="min-h-dvh px-5 py-10 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <div className="mb-12 flex items-center gap-2.5">
          <BrandMark className="size-7 text-ink" />
          <span className="text-lg font-semibold tracking-tight">Groundwork</span>
        </div>
        <p className="text-sm text-ink-3">{path.role}</p>
        <h1 className="mt-2 text-[2rem] leading-tight font-semibold tracking-[-0.02em]">{user.onboardedAt ? "Update your availability" : `Welcome, ${firstName}.`}</h1>
        <div className="prose-gw mt-5">
          <p>
            Your syllabus has <strong>{domains.filter((d) => !d.isSpecialization).length} learning domains</strong> and <strong>{topics.length} trackable topics</strong>, roughly{" "}
            <strong>{Math.round(allMinutes / 60)} hours</strong> of focused study. The essentials alone are about <strong>{Math.round(essentialMinutes / 60)} hours</strong>.
          </p>
          <p>
            There are {days.length} days left until December 31. Your plan schedules the most important foundations and AI-native skills that genuinely fit your time, adds weekend projects, revision and
            assessments, and marks the rest as continued learning rather than pretending it will be finished.
          </p>
        </div>
        <OnboardingForm
          weekdays={weekdays}
          weekendDays={weekendDays}
          essentialHours={essentialMinutes / 60}
          initialWeekday={user.hoursWeekday ?? undefined}
          initialWeekend={user.hoursWeekend ?? undefined}
        />
      </div>
    </main>
  );
}
