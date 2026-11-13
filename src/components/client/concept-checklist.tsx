"use client";
import { useOptimistic, useTransition } from "react";
import { Check } from "lucide-react";
import { toggleSubtopic } from "@/server/actions/learning";
import { cx } from "@/components/ui";
import { useToast } from "./toast";

type Sub = { id: string; title: string; concepts: string[]; done: boolean };

export function ConceptChecklist({ subtopics, disabled }: { subtopics: Sub[]; disabled?: boolean }) {
  const toast = useToast();
  const [, start] = useTransition();
  const [items, setOptimistic] = useOptimistic(subtopics, (state, u: { id: string; done: boolean }) => state.map((s) => (s.id === u.id ? { ...s, done: u.done } : s)));
  const done = items.filter((s) => s.done).length;
  return (
    <div>
      <div className="mb-2 text-[13px] text-ink-3" aria-live="polite">
        {done} of {items.length} checked
      </div>
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
        {items.map((s) => (
          <li key={s.id} className="px-3.5 py-3 sm:px-4">
            <label className={cx("flex cursor-pointer items-start gap-3", disabled && "cursor-not-allowed opacity-60")}>
              <input
                type="checkbox"
                className="peer sr-only"
                checked={s.done}
                disabled={disabled}
                onChange={(e) => {
                  const next = e.target.checked;
                  start(async () => {
                    setOptimistic({ id: s.id, done: next });
                    const r = await toggleSubtopic(s.id, next);
                    if (!r.ok) toast("error", r.error);
                  });
                }}
              />
              <span
                aria-hidden="true"
                className={cx(
                  "mt-0.5 flex size-[20px] shrink-0 items-center justify-center rounded-md border transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)]",
                  s.done ? "border-st-completed bg-st-completed text-bg" : "border-line-strong",
                )}
              >
                {s.done && <Check className="size-3.5" strokeWidth={3} />}
              </span>
              <span className="min-w-0">
                <span className={cx("block text-[15px] font-medium", s.done ? "text-ink-2" : "text-ink")}>{s.title}</span>
                {s.concepts.length > 0 && (
                  <ul className="mt-1.5 space-y-1 text-[14px] text-ink-2">
                    {s.concepts.map((c, i) => (
                      <li key={i} className={cx("flex gap-2", c.startsWith("— ") && "pl-4 text-ink-3")}>
                        <span className="mt-[9px] h-px w-2.5 shrink-0 bg-line-strong" aria-hidden="true" />
                        {c.replace(/^— /, "")}
                      </li>
                    ))}
                  </ul>
                )}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
