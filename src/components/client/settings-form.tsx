"use client";
import { useState } from "react";
import { replanNow, updateAvailability } from "@/server/actions/settings";
import { Button, Field, cx, inputClass } from "@/components/ui";
import { useAction } from "./toast";

export function SettingsForm({ hoursWeekday, hoursWeekend, timezone }: { hoursWeekday: number; hoursWeekend: number; timezone: string }) {
  const [wd, setWd] = useState(String(hoursWeekday));
  const [we, setWe] = useState(String(hoursWeekend));
  const [tz, setTz] = useState(timezone);
  const [pending, run] = useAction();
  return (
    <div className="space-y-6">
      <form
        className="grid max-w-2xl gap-4 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => updateAvailability({ hoursWeekday: Number(wd), hoursWeekend: Number(we), timezone: tz }));
        }}
      >
        <Field label="Weekday hours" htmlFor="set-wd">
          <input id="set-wd" type="number" min={0.5} max={12} step={0.5} required value={wd} onChange={(e) => setWd(e.target.value)} className={cx(inputClass, "tnum")} />
        </Field>
        <Field label="Weekend hours" htmlFor="set-we">
          <input id="set-we" type="number" min={0} max={14} step={0.5} required value={we} onChange={(e) => setWe(e.target.value)} className={cx(inputClass, "tnum")} />
        </Field>
        <Field label="Timezone" htmlFor="set-tz" hint="IANA name, e.g. Asia/Kolkata">
          <input id="set-tz" value={tz} onChange={(e) => setTz(e.target.value)} required spellCheck={false} autoComplete="off" className={inputClass} />
        </Field>
        <div className="sm:col-span-3">
          <Button type="submit" variant="primary" disabled={pending}>
            Save and rebuild plan
          </Button>
        </div>
      </form>
      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <Button variant="secondary" disabled={pending} onClick={() => run(() => replanNow())}>
          Rebuild plan now
        </Button>
        <p className="text-[13px] text-ink-3">The plan also rebuilds automatically once a day, moving unfinished work forward.</p>
      </div>
    </div>
  );
}
