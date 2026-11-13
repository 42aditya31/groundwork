import { eq } from "drizzle-orm";
import { db, t } from "@/db";
import { ToastProvider } from "@/components/client/toast";
import { AppNav } from "@/components/client/nav";
import { requireOnboardedUser } from "@/server/auth";
import { getActiveTimer, getPath } from "@/server/data";
import { ensureFreshPlan } from "@/server/planner";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOnboardedUser();
  ensureFreshPlan(user);
  const path = getPath(user.pathId);
  const timer = getActiveTimer(user.id);
  let timerLabel: string | null = null;
  if (timer?.topicId) timerLabel = db.select({ title: t.topics.title }).from(t.topics).where(eq(t.topics.id, timer.topicId)).get()?.title ?? null;
  else if (timer?.projectId) timerLabel = db.select({ title: t.projects.title }).from(t.projects).where(eq(t.projects.id, timer.projectId)).get()?.title ?? null;

  return (
    <ToastProvider>
      <div data-path={user.pathId} className="min-h-dvh lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
        <AppNav
          user={{ name: user.name, role: path.role }}
          timer={timer ? { startedAt: timer.startedAt, label: timerLabel ?? "Learning session", topicId: timer.topicId, projectId: timer.projectId } : null}
        />
        <main id="main" className="min-w-0 px-4 pt-5 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-16">
          <div className="mx-auto w-full max-w-[1160px]">{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}
