"use client";
import Link from "next/link";
import { ExternalLink, FileText, PenTool, GitBranch, Globe, Image as ImageIcon, PenLine, Trash2, Video, Paperclip } from "lucide-react";
import { deleteProof, setProofReview } from "@/server/actions/work";
import { PROOF_TYPES, REVIEW_LABEL, REVIEW_STATUSES } from "@/lib/status";
import { EmptyState } from "@/components/ui";
import { useAction } from "./toast";

export type ProofView = {
  id: string;
  title: string;
  description: string;
  type: string;
  url: string | null;
  fileName: string | null;
  mime: string | null;
  reflection: string;
  reviewStatus: string;
  submittedAt: number;
  topicId: string | null;
  projectId: string | null;
  topicTitle: string | null;
  projectTitle: string | null;
};

const ICON: Record<string, typeof Globe> = { github: GitBranch, live: Globe, figma: PenTool, video: Video, link: Globe, image: ImageIcon, pdf: FileText, document: Paperclip, writing: PenLine, reflection: PenLine };

export function ProofList({ proofs, compact }: { proofs: ProofView[]; compact?: boolean }) {
  if (!proofs.length)
    return compact ? (
      <p className="text-sm text-ink-3">No evidence yet. Mastery requires at least one proof of work.</p>
    ) : (
      <EmptyState title="No proof of work yet">Add a repository, live link, Figma file, screenshot or written explanation and link it to a topic or project.</EmptyState>
    );
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
      {proofs.map((p) => (
        <ProofRow key={p.id} proof={p} />
      ))}
    </ul>
  );
}

function ProofRow({ proof }: { proof: ProofView }) {
  const [pending, run] = useAction();
  const Icon = ICON[proof.type] ?? Globe;
  const typeLabel = PROOF_TYPES.find((t) => t.value === proof.type)?.label ?? proof.type;
  const fileHref = proof.fileName ? `/api/files/${proof.id}` : null;
  return (
    <li className="px-3.5 py-3.5 sm:px-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-2">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-ink">{proof.title}</div>
          <div className="mt-0.5 text-[12.5px] text-ink-3">
            {typeLabel}, {new Date(proof.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </div>
          {proof.description && <p className="mt-1.5 line-clamp-4 text-[14px] whitespace-pre-wrap text-ink-2">{proof.description}</p>}
          {proof.reflection && <p className="mt-1.5 text-[13.5px] text-ink-3 italic">Reflection: {proof.reflection}</p>}
          {fileHref && proof.mime?.startsWith("image/") && (
            <a href={fileHref} target="_blank" rel="noopener noreferrer" className="mt-2 block w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-protected file */}
              <img src={fileHref} alt={`Screenshot: ${proof.title}`} className="max-h-48 rounded-lg border border-line object-cover" loading="lazy" />
            </a>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
            {proof.url && (
              <a href={proof.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-ink-2 hover:text-ink">
                Open link <ExternalLink className="size-3" />
              </a>
            )}
            {fileHref && (
              <a href={fileHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-ink-2 hover:text-ink">
                {proof.fileName} <ExternalLink className="size-3" />
              </a>
            )}
            {proof.topicId && proof.topicTitle && (
              <Link href={`/roadmap/${proof.topicId}`} className="text-ink-3 hover:text-ink">
                Topic: {proof.topicTitle}
              </Link>
            )}
            {proof.projectId && proof.projectTitle && (
              <Link href={`/projects/${proof.projectId}`} className="text-ink-3 hover:text-ink">
                Project: {proof.projectTitle}
              </Link>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <select
            aria-label={`Review status of ${proof.title}`}
            value={proof.reviewStatus}
            disabled={pending}
            onChange={(e) => run(() => setProofReview(proof.id, e.target.value), { silent: true })}
            className="h-8 rounded-md border border-line bg-surface px-2 text-[12.5px] text-ink-2"
          >
            {REVIEW_STATUSES.map((s) => (
              <option key={s} value={s}>
                {REVIEW_LABEL[s]}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (window.confirm(`Delete "${proof.title}"? Any uploaded file is removed too.`)) run(() => deleteProof(proof.id));
            }}
            className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-[12.5px] text-ink-3 hover:text-st-revision"
          >
            <Trash2 className="size-3.5" /> Delete
          </button>
        </div>
      </div>
    </li>
  );
}
