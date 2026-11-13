"use client";
import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { createProof } from "@/server/actions/work";
import { PROOF_TYPES } from "@/lib/status";
import { Button, Field, cx, inputClass } from "@/components/ui";
import { useAction } from "./toast";

type Option = { id: string; label?: string; title?: string };

export function ProofForm({
  pathId,
  fixedTopic,
  fixedProject,
  topics,
  projects,
  onDone,
}: {
  pathId: string;
  fixedTopic?: { id: string; label: string };
  fixedProject?: { id: string; title: string };
  topics?: Option[];
  projects?: Option[];
  onDone?: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState(pathId === "designer" ? "figma" : "github");
  const [fileName, setFileName] = useState("");
  const [pending, run] = useAction();
  const kind = PROOF_TYPES.find((p) => p.value === type)!;
  const id = (s: string) => `proof-${fixedTopic?.id ?? fixedProject?.id ?? "new"}-${s}`;
  const accept = type === "image" ? "image/png,image/jpeg,image/webp,image/gif" : type === "pdf" ? "application/pdf" : ".pdf,.doc,.docx,.ppt,.pptx,.key,.txt,.md,.png,.jpg,.jpeg,.webp,.fig,.zip";

  return (
    <form
      ref={formRef}
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        run(() => createProof(fd), {
          onSuccess: () => {
            formRef.current?.reset();
            setFileName("");
            onDone?.();
          },
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" htmlFor={id("title")}>
          <input id={id("title")} name="title" required minLength={3} maxLength={160} className={inputClass} placeholder={pathId === "designer" ? "e.g. Type scale and color system" : "e.g. Responsive grid layout demo"} />
        </Field>
        <Field label="Evidence type" htmlFor={id("type")}>
          <select id={id("type")} name="type" value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
            {PROOF_TYPES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {kind.needs === "url" && (
        <Field label="Link" htmlFor={id("url")} hint={type === "github" ? "Repository URL, e.g. https://github.com/you/project" : type === "figma" ? "Share link to the Figma file or prototype" : undefined}>
          <input id={id("url")} name="url" type="url" required inputMode="url" placeholder="https://" className={inputClass} />
        </Field>
      )}
      {kind.needs === "file" && (
        <Field label="File" htmlFor={id("file")} hint="Up to 15 MB. Files are private to your account.">
          <label
            htmlFor={id("file")}
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-line-strong bg-surface px-3 py-3 text-sm text-ink-2 hover:border-ink focus-within:outline-2 focus-within:outline-[var(--focus)]"
          >
            <Upload className="size-4 text-ink-3" />
            <span className="truncate">{fileName || "Choose a file or take a photo"}</span>
            <input id={id("file")} name="file" type="file" required accept={accept} className="sr-only" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")} />
          </label>
        </Field>
      )}

      <Field
        label={kind.needs === "text" ? (type === "reflection" ? "Reflection" : "Explanation") : "Description"}
        htmlFor={id("description")}
        hint={kind.needs === "text" ? "At least a few sentences. Explain what you did, how, and what you'd do differently." : "What does this show you can do?"}
      >
        <textarea id={id("description")} name="description" rows={kind.needs === "text" ? 6 : 3} required={kind.needs === "text"} minLength={kind.needs === "text" ? 40 : 0} className={inputClass} />
      </Field>

      {(!fixedTopic || !fixedProject) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {fixedTopic ? (
            <input type="hidden" name="topicId" value={fixedTopic.id} />
          ) : (
            <Field label="Related topic" htmlFor={id("topic")}>
              <select id={id("topic")} name="topicId" className={inputClass} defaultValue="">
                <option value="">None</option>
                {topics?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label ?? t.title}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {fixedProject ? (
            <input type="hidden" name="projectId" value={fixedProject.id} />
          ) : (
            <Field label="Related project" htmlFor={id("project")}>
              <select id={id("project")} name="projectId" className={inputClass} defaultValue="">
                <option value="">None</option>
                {projects?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title ?? p.label}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
      )}
      {fixedTopic && fixedProject && (
        <>
          <input type="hidden" name="topicId" value={fixedTopic.id} />
          <input type="hidden" name="projectId" value={fixedProject.id} />
        </>
      )}

      <Field label="Personal reflection (optional)" htmlFor={id("reflection")}>
        <textarea id={id("reflection")} name="reflection" rows={2} className={inputClass} placeholder="What was hard? What would you do differently?" />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={pending} className={cx(pending && "cursor-wait")}>
          {pending ? "Saving…" : "Save proof of work"}
        </Button>
      </div>
    </form>
  );
}
