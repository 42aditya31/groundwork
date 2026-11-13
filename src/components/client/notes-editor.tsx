"use client";
import { useState } from "react";
import { saveTopicNotes } from "@/server/actions/learning";
import { Button, inputClass, cx } from "@/components/ui";
import { useAction } from "./toast";

export function NotesEditor({ topicId, initial }: { topicId: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, run] = useAction();
  const dirty = value !== saved;
  const save = () => run(() => saveTopicNotes(topicId, value), { onSuccess: () => setSaved(value), silent: true });
  return (
    <div>
      <label htmlFor={`notes-${topicId}`} className="sr-only">
        Personal notes
      </label>
      <textarea
        id={`notes-${topicId}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => dirty && save()}
        rows={7}
        placeholder="Summaries, questions, gotchas, links. Notes save when you click away."
        className={cx(inputClass, "font-serif text-[16px] leading-relaxed")}
      />
      <div className="mt-2 flex items-center justify-between text-[13px] text-ink-3">
        <span aria-live="polite">{pending ? "Saving…" : dirty ? "Unsaved changes" : "Saved"}</span>
        <Button size="sm" variant="secondary" disabled={!dirty || pending} onClick={save}>
          Save notes
        </Button>
      </div>
    </div>
  );
}
