"use client";
import { useState } from "react";
import { submitMastery } from "@/server/actions/learning";
import { MASTERY_THRESHOLD, MIN_EXPLANATION_CHARS, RATING_LABELS, type Criterion } from "@/lib/mastery";
import { Button, cx, inputClass } from "@/components/ui";
import { useAction } from "./toast";

export function MasteryForm({ topicId, criteria, status, proofs }: { topicId: string; criteria: Criterion[]; status: string; proofs: { id: string; title: string; type: string; linked: boolean }[] }) {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [explanation, setExplanation] = useState("");
  // Linked proofs are selected by default (including ones added after this form mounted); user choices override.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const selected = new Set(proofs.filter((p) => overrides[p.id] ?? p.linked).map((p) => p.id));
  const [pending, run] = useAction();
  const ready = ["completed", "needs_revision", "mastered"].includes(status);
  const allRated = criteria.every((c) => ratings[c.key]);
  const wouldPass = allRated && criteria.every((c) => ratings[c.key] >= MASTERY_THRESHOLD) && selected.size > 0 && explanation.trim().length >= MIN_EXPLANATION_CHARS;
  const sorted = [...proofs].sort((a, b) => Number(b.linked) - Number(a.linked));

  if (!ready)
    return <p className="rounded-xl border border-dashed border-line-strong px-4 py-4 text-sm text-ink-3">Mark this topic as completed first. Mastery is assessed separately, with evidence.</p>;
  if (status === "mastered")
    return <p className="rounded-xl border border-line bg-surface px-4 py-4 text-sm text-ink-2">You&apos;ve mastered this topic. If it gets rusty, flag it for revision and reassess later.</p>;

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => submitMastery({ topicId, ratings, explanation, proofIds: [...selected] }), {
          onSuccess: () => {
            setRatings({});
            setExplanation("");
          },
        });
      }}
    >
      <div className="space-y-4">
        {criteria.map((c) => (
          <fieldset key={c.key}>
            <legend className="text-[15px] font-medium text-ink">{c.label}</legend>
            <p className="text-[13px] text-ink-3">{c.prompt}</p>
            <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {[1, 2, 3, 4].map((v) => (
                <label
                  key={v}
                  className={cx(
                    "flex cursor-pointer items-center justify-center rounded-lg border px-2 py-2 text-center text-[13px] transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--focus)]",
                    ratings[c.key] === v ? "border-ink bg-ink text-bg" : "border-line-strong bg-surface text-ink-2 hover:text-ink",
                  )}
                >
                  <input type="radio" name={c.key} value={v} className="sr-only" checked={ratings[c.key] === v} onChange={() => setRatings((r) => ({ ...r, [c.key]: v }))} />
                  {RATING_LABELS[v]}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <label className="block space-y-1.5">
        <span className="text-[15px] font-medium text-ink">Explain it in your own words</span>
        <span className="block text-[13px] text-ink-3">How it works, when to use it, a trade-off or a mistake you made. At least {MIN_EXPLANATION_CHARS} characters.</span>
        <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={5} className={cx(inputClass, "font-serif text-[16px]")} />
        <span className="tnum block text-right text-[12px] text-ink-3">{explanation.trim().length} characters</span>
      </label>

      <fieldset>
        <legend className="text-[15px] font-medium text-ink">Evidence</legend>
        <p className="text-[13px] text-ink-3">Select proof of work that demonstrates this topic. Unlinked entries you select will be linked to it.</p>
        {sorted.length ? (
          <ul className="mt-2 max-h-56 space-y-1 overflow-auto rounded-lg border border-line bg-surface p-2">
            {sorted.map((p) => (
              <li key={p.id}>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-surface-2">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={(e) => setOverrides((o) => ({ ...o, [p.id]: e.target.checked }))}
                    className="size-4 accent-[var(--accent)]"
                  />
                  <span className="min-w-0 flex-1 truncate text-ink">{p.title}</span>
                  {p.linked && <span className="text-[12px] text-ink-3">linked</span>}
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-st-revision">Add a proof of work entry above first — mastery can&apos;t be claimed without evidence.</p>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-[13px] text-ink-3" aria-live="polite">
          {!allRated ? "Rate every criterion." : wouldPass ? "This assessment meets the mastery bar." : "This will be saved, and the topic flagged for revision until it meets the bar."}
        </p>
        <Button type="submit" variant="primary" disabled={pending || !allRated || explanation.trim().length < MIN_EXPLANATION_CHARS}>
          Submit assessment
        </Button>
      </div>
    </form>
  );
}
