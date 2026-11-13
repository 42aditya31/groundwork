"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { completeOnboarding, type OnboardingState } from "@/server/actions/settings";
import { buttonClass, cx, inputClass } from "@/components/ui";

const PRESETS = [1, 2, 3, 4, 6];

export function OnboardingForm(props: { weekdays: number; weekendDays: number; essentialHours: number; initialWeekday?: number; initialWeekend?: number }) {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(completeOnboarding, {});
  const [weekday, setWeekday] = useState(props.initialWeekday ?? 3);
  const [weekend, setWeekend] = useState(props.initialWeekend ?? 4);
  const tzInput = useRef<HTMLInputElement>(null);
  const tzLabel = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    // The browser's timezone is only known on the client; write it straight into the form.
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    if (tzInput.current) tzInput.current.value = zone;
    if (tzLabel.current) tzLabel.current.textContent = zone;
  }, []);

  // Rough preview: weekdays carry learning (≈85% after review), weekends carry projects.
  const learningHours = props.weekdays * weekday * 0.85;
  const projectHours = props.weekendDays * weekend;
  const coverage = Math.min(100, Math.round((learningHours / Math.max(1, props.essentialHours)) * 100));

  return (
    <form action={action} className="mt-10 space-y-8">
      <input ref={tzInput} type="hidden" name="timezone" defaultValue="UTC" />
      <fieldset>
        <legend className="text-[15px] font-semibold">How many hours can you realistically study on a weekday?</legend>
        <p className="mt-1 text-sm text-ink-3">Be honest — the plan is only useful if you can keep it.</p>
        <HoursPicker name="hoursWeekday" value={weekday} onChange={setWeekday} min={0.5} max={12} />
      </fieldset>
      <fieldset>
        <legend className="text-[15px] font-semibold">And on Saturdays and Sundays?</legend>
        <p className="mt-1 text-sm text-ink-3">Weekends are reserved for the weekly project built from that week&apos;s topics.</p>
        <HoursPicker name="hoursWeekend" value={weekend} onChange={setWeekend} min={0} max={14} />
      </fieldset>

      <div className="rounded-xl border border-line bg-surface p-5">
        <p className="text-sm text-ink-2">
          About <strong className="tnum text-ink">{Math.round(learningHours)} h</strong> of topic study and <strong className="tnum text-ink">{Math.round(projectHours)} h</strong> of project work before
          December 31.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${coverage}%` }} />
          </div>
          <span className="tnum w-12 text-right text-sm font-medium">{coverage}%</span>
        </div>
        <p className="mt-2 text-[13px] text-ink-3">
          {coverage >= 100
            ? "All essential topics fit. Senior-level topics are added as stretch goals while time allows."
            : `Roughly ${coverage}% of the essential syllabus fits. Every domain still gets its most important topics; the rest becomes continued learning for 2027.`}
        </p>
      </div>

      {state.error && (
        <p role="alert" className="text-sm font-medium text-st-revision">
          {state.error}
        </p>
      )}
      <div className="flex items-center justify-between gap-4">
        <p className="text-[13px] text-ink-3">
          Timezone: <span ref={tzLabel}>detecting…</span>. You can change these later in Settings.
        </p>
        <button type="submit" disabled={pending} className={buttonClass("primary", "lg")}>
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Building your plan
            </>
          ) : (
            "Build my plan"
          )}
        </button>
      </div>
    </form>
  );
}

function HoursPicker({ name, value, onChange, min, max }: { name: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => (
        <button
          key={p}
          type="button"
          aria-pressed={value === p}
          onClick={() => onChange(p)}
          className={cx(
            "tnum h-10 min-w-14 rounded-lg border px-3 text-sm font-medium transition-colors",
            value === p ? "border-ink bg-ink text-bg" : "border-line-strong bg-surface text-ink-2 hover:text-ink",
          )}
        >
          {p} h
        </button>
      ))}
      <label className="ml-1 flex items-center gap-2 text-sm text-ink-3">
        <span>Other</span>
        <input
          name={name}
          type="number"
          inputMode="decimal"
          step={0.5}
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={cx(inputClass, "tnum w-24")}
          aria-label={`${name === "hoursWeekday" ? "Weekday" : "Weekend"} hours`}
        />
      </label>
    </div>
  );
}
