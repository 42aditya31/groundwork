import { getSessionUser } from "@/server/auth";
import { readContent } from "@/server/content";

/** Serves the signed-in learner's syllabus database (only their own path). */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return new Response("Not signed in", { status: 401 });
  const { bytes, version } = readContent(user.pathId);
  const requested = new URL(request.url).searchParams.get("v");
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/vnd.sqlite3",
      "Cache-Control": requested === version ? "private, max-age=31536000, immutable" : "private, no-cache",
      ETag: `"${version}"`,
    },
  });
}
