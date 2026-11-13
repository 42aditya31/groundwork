"use client";
import { Play } from "lucide-react";
import { setTopicStatus, startSession } from "@/server/actions/learning";
import { Button, buttonClass } from "@/components/ui";
import { useAction } from "./toast";

export function TopicActions({ topicId, status }: { topicId: string; status: string }) {
  const [pending, run] = useAction();
  const set = (s: string) => run(() => setTopicStatus(topicId, s));
  const session = (
    <Button variant="secondary" disabled={pending} onClick={() => run(() => startSession({ topicId }))}>
      <Play className="size-4" /> Start timed session
    </Button>
  );
  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      {status === "not_started" && (
        <>
          <Button variant="primary" disabled={pending} onClick={() => set("learning")}>
            Start learning
          </Button>
          {session}
        </>
      )}
      {status === "learning" && (
        <>
          <Button variant="primary" disabled={pending} onClick={() => set("completed")}>
            Mark as completed
          </Button>
          <Button variant="secondary" disabled={pending} onClick={() => set("practiced")}>
            I&apos;ve practiced this
          </Button>
          {session}
        </>
      )}
      {status === "practiced" && (
        <>
          <Button variant="primary" disabled={pending} onClick={() => set("completed")}>
            Mark as completed
          </Button>
          {session}
        </>
      )}
      {status === "completed" && (
        <>
          <a href="#mastery" className={buttonClass("primary")}>
            Assess mastery
          </a>
          <Button variant="secondary" disabled={pending} onClick={() => set("needs_revision")}>
            Flag for revision
          </Button>
          <Button variant="ghost" disabled={pending} onClick={() => set("learning")}>
            Reopen
          </Button>
        </>
      )}
      {status === "needs_revision" && (
        <>
          <Button variant="primary" disabled={pending} onClick={() => set("completed")}>
            Revised, mark completed
          </Button>
          <a href="#mastery" className={buttonClass("secondary")}>
            Reassess mastery
          </a>
          {session}
        </>
      )}
      {status === "mastered" && (
        <>
          <p className="text-sm text-ink-2">Mastered, with evidence on record.</p>
          <Button variant="secondary" disabled={pending} onClick={() => set("needs_revision")}>
            Flag for revision
          </Button>
        </>
      )}
    </div>
  );
}
