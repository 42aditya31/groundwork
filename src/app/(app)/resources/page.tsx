import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { db, t } from "@/db";
import { RESOURCE_CATEGORIES } from "@/lib/syllabus/parse";
import { PageHeader } from "@/components/ui";
import { ResourceLibrary } from "@/components/client/resource-library";
import { requireOnboardedUser } from "@/server/auth";

export const metadata: Metadata = { title: "Resources" };

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<{ domain?: string }> }) {
  const user = await requireOnboardedUser();
  const { domain } = await searchParams;
  const resources = db.select().from(t.resources).where(eq(t.resources.pathId, user.pathId)).orderBy(asc(t.resources.sort)).all();
  const domains = db.select({ id: t.domains.id, code: t.domains.code, title: t.domains.title }).from(t.domains).where(eq(t.domains.pathId, user.pathId)).orderBy(asc(t.domains.sort)).all();
  const states = new Map(db.select().from(t.resourceStates).where(eq(t.resourceStates.userId, user.id)).all().map((s) => [s.resourceId, s]));
  const rows = resources.map((r) => {
    const s = states.get(r.id);
    return {
      id: r.id,
      name: r.name,
      url: r.url,
      extraUrls: JSON.parse(r.extraUrls) as string[],
      creator: r.creator,
      type: r.type,
      what: r.what,
      category: r.category,
      section: r.section,
      domainId: r.domainId,
      bookmarked: s?.bookmarked ?? false,
      read: s?.read ?? false,
      note: s?.note ?? "",
    };
  });
  const read = rows.filter((r) => r.read).length;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Resources"
        description={`${rows.length} resources from your syllabus, linked to the domains they support. ${read} marked as read.`}
      />
      <ResourceLibrary resources={rows} domains={domains} categories={RESOURCE_CATEGORIES} initialDomain={domain && domains.some((d) => d.id === domain) ? domain : ""} />
    </div>
  );
}
