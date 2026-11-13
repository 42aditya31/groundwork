import "server-only";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

/** The prebuilt syllabus database for a path (see scripts/build-content.ts). */
const cache = new Map<string, { bytes: Buffer; version: string }>();

export function readContent(pathId: string) {
  const hit = cache.get(pathId);
  if (hit && process.env.NODE_ENV === "production") return hit;
  const file = path.join(/*turbopackIgnore: true*/ process.cwd(), "content", `${pathId}.sqlite`);
  const bytes = fs.readFileSync(file);
  const entry = { bytes, version: createHash("sha256").update(bytes).digest("hex").slice(0, 16) };
  cache.set(pathId, entry);
  return entry;
}
