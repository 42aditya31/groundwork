import type { Metadata } from "next";
import { PageHeader, Section } from "@/components/ui";
import { SettingsForm } from "@/components/client/settings-form";
import { requireOnboardedUser } from "@/server/auth";
import { getPath, getPathTree } from "@/server/data";
import { isDone } from "@/lib/status";
import { formatMinutes } from "@/lib/dates";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireOnboardedUser();
  const path = getPath(user.pathId);
  const topics = getPathTree(user.id, user.pathId).flatMap((d) => d.topics);
  const remaining = topics.filter((x) => !isDone(x.status));
  const bucketMinutes = (b: string) => remaining.filter((x) => x.bucket === b).reduce((n, x) => n + x.estMinutes, 0);
  return (
    <div className="space-y-10">
      <PageHeader title="Settings" description={`${user.name}, ${path.role}`} />
      <Section title="Availability" description="Your plan is rebuilt from these numbers. Lowering them is better than missing work every day.">
        <SettingsForm hoursWeekday={user.hoursWeekday ?? 3} hoursWeekend={user.hoursWeekend ?? 4} timezone={user.timezone} />
      </Section>
      <Section title="Current plan">
        <dl className="divide-y divide-line border-y border-line text-sm">
          <div className="flex justify-between py-2.5">
            <dt className="text-ink-2">Scheduled before December 31</dt>
            <dd className="tnum font-medium">
              {remaining.filter((x) => x.bucket === "core").length} topics ({formatMinutes(bucketMinutes("core"))} estimated)
            </dd>
          </div>
          <div className="flex justify-between py-2.5">
            <dt className="text-ink-2">Stretch goals</dt>
            <dd className="tnum font-medium">{remaining.filter((x) => x.bucket === "stretch").length} topics</dd>
          </div>
          <div className="flex justify-between py-2.5">
            <dt className="text-ink-2">Continued learning (after the deadline)</dt>
            <dd className="tnum font-medium">{remaining.filter((x) => x.bucket === "continued").length} topics</dd>
          </div>
          <div className="flex justify-between py-2.5">
            <dt className="text-ink-2">Already completed</dt>
            <dd className="tnum font-medium">{topics.length - remaining.length} topics</dd>
          </div>
        </dl>
        {user.planNote && <p className="mt-3 text-sm text-ink-3">{user.planNote}</p>}
      </Section>
      <Section title="Account">
        <p className="text-sm text-ink-2">
          Signed in as <strong className="font-medium text-ink">{user.name}</strong>. Your learning data is private to your account. Use the sidebar or the More menu to log out.
        </p>
        <p className="mt-2 text-sm text-ink-3">Syllabus source: {path.sourceFile}</p>
      </Section>
    </div>
  );
}
