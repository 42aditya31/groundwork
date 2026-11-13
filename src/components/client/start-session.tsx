"use client";
import { Play } from "lucide-react";
import { startSession } from "@/server/actions/learning";
import { Button } from "@/components/ui";
import { useAction } from "./toast";

export function StartSessionButton({ topicId, projectId, label = "Start session", variant = "primary" }: { topicId?: string; projectId?: string; label?: string; variant?: "primary" | "secondary" }) {
  const [pending, run] = useAction();
  return (
    <Button variant={variant} disabled={pending} onClick={() => run(() => startSession({ topicId, projectId }))}>
      <Play className="size-4" />
      {label}
    </Button>
  );
}
