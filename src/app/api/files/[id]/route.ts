import fs from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db, t } from "@/db";
import { getSessionUser } from "@/server/auth";
import { uploadDir } from "@/server/files";

/** Serves an uploaded proof-of-work file to its owner only. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return new Response("Not signed in", { status: 401 });
  const { id } = await params;
  const proof = db.select().from(t.proofs).where(and(eq(t.proofs.id, id), eq(t.proofs.userId, user.id))).get();
  if (!proof?.filePath) return new Response("Not found", { status: 404 });
  const base = uploadDir();
  const full = path.resolve(base, proof.filePath);
  if (!full.startsWith(base + path.sep)) return new Response("Not found", { status: 404 });
  try {
    const data = await fs.readFile(full);
    const inline = (proof.mime ?? "").startsWith("image/") || proof.mime === "application/pdf";
    const download = new URL(request.url).searchParams.has("download");
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": proof.mime ?? "application/octet-stream",
        "Content-Length": String(data.length),
        "Content-Disposition": `${inline && !download ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(proof.fileName ?? "file")}`,
        "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("File missing", { status: 404 });
  }
}
