"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Square } from "lucide-react";
import { stopSession } from "@/server/actions/learning";
import { Button, cx, inputClass } from "@/components/ui";
import { useAction } from "./toast";

export type TimerInfo = { startedAt: number; label: string; topicId: string | null; projectId: string | null };

function useElapsed(startedAt: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return Math.max(0, Math.floor((now - startedAt) / 1000));
}

export function formatElapsed(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

export function SessionTimer({ timer, compact }: { timer: TimerInfo; compact?: boolean }) {
  const elapsed = useElapsed(timer.startedAt);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, run] = useAction();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  const href = timer.topicId ? `/roadmap/${timer.topicId}` : timer.projectId ? `/projects/${timer.projectId}` : "/today";

  return (
    <>
      <div className={cx("flex items-center gap-2 rounded-lg border border-line bg-surface", compact ? "h-9 pr-1 pl-2.5" : "p-2.5")}>
        <span className="animate-live size-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
        <Link href={href} className="min-w-0 flex-1">
          {!compact && <span className="block truncate text-[12.5px] text-ink-3">{timer.label}</span>}
          <span className="tnum block text-sm font-semibold" aria-label={`Session running for ${formatElapsed(elapsed)}`}>
            {formatElapsed(elapsed)}
          </span>
        </Link>
        <button type="button" onClick={() => setOpen(true)} className="flex size-7 items-center justify-center rounded-md bg-ink text-bg hover:bg-ink/85" aria-label="Stop session">
          <Square className="size-3 fill-current" />
        </button>
      </div>
      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        className="m-auto w-[min(92vw,26rem)] rounded-2xl border border-line bg-surface p-0 text-ink shadow-pop"
        aria-labelledby="stop-title"
      >
        <form
          className="space-y-4 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => stopSession(note), { onSuccess: () => { setOpen(false); setNote(""); } });
          }}
        >
          <div>
            <h2 id="stop-title" className="text-lg font-semibold">
              Finish session
            </h2>
            <p className="mt-1 text-sm text-ink-2">
              {timer.label} — <span className="tnum">{formatElapsed(elapsed)}</span>
            </p>
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">What did you learn or build? (optional)</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={inputClass} />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Keep going
            </Button>
            <Button variant="primary" type="submit" disabled={pending}>
              Save session
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
