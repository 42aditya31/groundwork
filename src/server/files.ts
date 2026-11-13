import "server-only";
import path from "node:path";

export function uploadDir() {
  return path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? path.join(process.cwd(), "data", "uploads"));
}
