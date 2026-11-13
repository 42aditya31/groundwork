"use client";
import { useState } from "react";
import { addCustomTask, logSession } from "@/server/actions/learning";
import { Button, Field, cx, inputClass } from "@/components/ui";
import { useAction } from "./toast";

type TopicOption = { id: string; label: string };

export function LogTimeForm({ topics, fixedTopicId, fixedProjectId }: { topics?: TopicOption[]; fixedTopicId?: string; fixedProjectId?: string }) {
  const [topicId, setTopicId] = useState(fixedTopicId ?? "");
  const [minutes, setMinutes] = useState("30");
  const [note, setNote] = useState("");
  const [pending, run] = useAction();
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => logSession({ topicId: topicId || null, projectId: fixedProjectId ?? null, minutes: Number(minutes), note }), {
          onSuccess: () => setNote(""),
        });
      }}
    >
      {!fixedTopicId && topics && (
        <Field label="Topic" htmlFor="log-topic">
          <select id="log-topic" value={topicId} onChange={(e) => setTopicId(e.target.value)} className={inputClass}>
            <option value="">General study (no topic)</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Minutes" htmlFor={`log-min-${fixedTopicId ?? fixedProjectId ?? "x"}`}>
        <input
          id={`log-min-${fixedTopicId ?? fixedProjectId ?? "x"}`}
          type="number"
          min={1}
          max={600}
          required
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          className={cx(inputClass, "tnum")}
        />
      </Field>
      <Field label="What did you do? (optional)" htmlFor={`log-note-${fixedTopicId ?? fixedProjectId ?? "x"}`}>
        <textarea id={`log-note-${fixedTopicId ?? fixedProjectId ?? "x"}`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
      </Field>
      <Button type="submit" variant="secondary" disabled={pending} className="w-full">
        Log time
      </Button>
    </form>
  );
}

export function AddTaskForm({ date, topics }: { date: string; topics: TopicOption[] }) {
  const [title, setTitle] = useState("");
  const [day, setDay] = useState(date);
  const [minutes, setMinutes] = useState("30");
  const [topicId, setTopicId] = useState("");
  const [pending, run] = useAction();
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => addCustomTask({ date: day, title, minutes: Number(minutes), topicId: topicId || null }), { onSuccess: () => setTitle("") });
      }}
    >
      <Field label="Task" htmlFor="task-title">
        <input id="task-title" required minLength={2} maxLength={140} value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="e.g. Rebuild the card layout with Grid" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Day" htmlFor="task-date">
          <input id="task-date" type="date" required value={day} min={date} onChange={(e) => setDay(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Minutes" htmlFor="task-min">
          <input id="task-min" type="number" min={5} max={600} required value={minutes} onChange={(e) => setMinutes(e.target.value)} className={cx(inputClass, "tnum")} />
        </Field>
      </div>
      <Field label="Related topic (optional)" htmlFor="task-topic">
        <select id="task-topic" value={topicId} onChange={(e) => setTopicId(e.target.value)} className={inputClass}>
          <option value="">None</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>
      <Button type="submit" variant="secondary" disabled={pending} className="w-full">
        Add task
      </Button>
    </form>
  );
}
