"use client";
import { useState } from "react";
import { saveProjectWork, setProjectStatus } from "@/server/actions/work";
import { RATING_LABELS } from "@/lib/mastery";
import { PROJECT_STATUS_LABEL, type ProjectStatus } from "@/lib/status";
import { Button, Field, cx, inputClass } from "@/components/ui";
import { useAction } from "./toast";

export function ProjectWork({
  projectId,
  status,
  criteria,
  initial,
  proofCount,
}: {
  projectId: string;
  status: string;
  criteria: string[];
  initial: { deliverableText: string; reflection: string; skills: string; selfAssessment: Record<string, number> };
  proofCount: number;
}) {
  const [deliverableText, setDeliverable] = useState(initial.deliverableText);
  const [reflection, setReflection] = useState(initial.reflection);
  const [skills, setSkills] = useState(initial.skills);
  const [selfAssessment, setSA] = useState<Record<string, number>>(initial.selfAssessment);
  const [pending, run] = useAction();
  const dirty =
    deliverableText !== initial.deliverableText || reflection !== initial.reflection || skills !== initial.skills || JSON.stringify(selfAssessment) !== JSON.stringify(initial.selfAssessment);

  const checklist = [
    { ok: deliverableText.trim().length >= 20, label: "Deliverable described" },
    { ok: proofCount > 0, label: "Proof of work attached" },
    { ok: criteria.every((_, i) => selfAssessment[String(i)]), label: "Every criterion self-assessed" },
    { ok: reflection.trim().length >= 40, label: "Reflection written" },
    { ok: skills.trim().length >= 3, label: "Skills demonstrated listed" },
  ];
  const canSubmit = checklist.every((c) => c.ok) && !dirty;
  const save = () => run(() => saveProjectWork(projectId, { deliverableText, reflection, skills, selfAssessment }));
  const locked = status === "completed";

  return (
    <div className="space-y-6">
      <fieldset disabled={locked} className="space-y-5">
        <Field label="Deliverable" htmlFor="pw-deliverable" hint="What did you build or design? Include links in your proof of work.">
          <textarea id="pw-deliverable" rows={4} value={deliverableText} onChange={(e) => setDeliverable(e.target.value)} className={inputClass} />
        </Field>
        <div>
          <div className="text-sm font-medium text-ink">Self-assessment</div>
          <p className="text-[13px] text-ink-3">Rate your work honestly against each evaluation criterion.</p>
          <div className="mt-3 space-y-3">
            {criteria.map((c, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <span className="text-[14px] text-ink-2">{c}</span>
                <div role="radiogroup" aria-label={c} className="flex gap-1">
                  {[1, 2, 3, 4].map((v) => (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={selfAssessment[String(i)] === v}
                      title={RATING_LABELS[v]}
                      onClick={() => setSA((s) => ({ ...s, [String(i)]: v }))}
                      className={cx(
                        "tnum h-8 w-9 rounded-md border text-[13px] transition-colors",
                        selfAssessment[String(i)] === v ? "border-ink bg-ink text-bg" : "border-line-strong bg-surface text-ink-2 hover:text-ink",
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-[12.5px] text-ink-3">1 not yet, 2 with help, 3 independently, 4 could teach it.</p>
          </div>
        </div>
        <Field label="Reflection" htmlFor="pw-reflection" hint="What went well, what was hard, what you'd do differently.">
          <textarea id="pw-reflection" rows={4} value={reflection} onChange={(e) => setReflection(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Skills demonstrated" htmlFor="pw-skills" hint="Comma-separated, e.g. CSS Grid, accessible forms, error states">
          <input id="pw-skills" value={skills} onChange={(e) => setSkills(e.target.value)} className={inputClass} />
        </Field>
      </fieldset>

      <div className="rounded-xl border border-line bg-surface p-4">
        <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
          {checklist.map((c) => (
            <li key={c.label} className={cx("flex items-center gap-2", c.ok ? "text-ink-2" : "text-ink-3")}>
              <span className={cx("size-2 rounded-full", c.ok ? "bg-st-completed" : "border border-line-strong")} aria-hidden="true" />
              {c.label}
              <span className="sr-only">{c.ok ? "(done)" : "(missing)"}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <span className="text-sm text-ink-2">
            Status: <strong className="font-medium text-ink">{PROJECT_STATUS_LABEL[status as ProjectStatus]}</strong>
          </span>
          <div className="flex flex-wrap gap-2">
            {!locked && (
              <Button variant="secondary" disabled={pending || !dirty} onClick={save}>
                Save progress
              </Button>
            )}
            {status === "planned" && !dirty && (
              <Button variant="secondary" disabled={pending} onClick={() => run(() => setProjectStatus(projectId, "in_progress"))}>
                Start project
              </Button>
            )}
            {(status === "planned" || status === "in_progress") && (
              <Button variant="primary" disabled={pending || !canSubmit} onClick={() => run(() => setProjectStatus(projectId, "submitted"))} title={dirty ? "Save your changes first" : undefined}>
                Submit project
              </Button>
            )}
            {status === "submitted" && (
              <>
                <Button variant="secondary" disabled={pending} onClick={() => run(() => setProjectStatus(projectId, "under_review"))}>
                  Mark under review
                </Button>
                <Button variant="primary" disabled={pending} onClick={() => run(() => setProjectStatus(projectId, "completed"))}>
                  Mark completed
                </Button>
              </>
            )}
            {status === "under_review" && (
              <Button variant="primary" disabled={pending} onClick={() => run(() => setProjectStatus(projectId, "completed"))}>
                Mark completed
              </Button>
            )}
            {(status === "submitted" || status === "under_review" || status === "completed") && (
              <Button variant="ghost" disabled={pending} onClick={() => run(() => setProjectStatus(projectId, "in_progress"))}>
                Reopen
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
