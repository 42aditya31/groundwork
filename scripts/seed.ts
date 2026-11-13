/**
 * Loads both syllabus Markdown files into the database and creates the two learner accounts.
 *
 *   npm run db:seed                 # content + users (passwords only set when a user is first created)
 *   npm run db:seed -- --reset-passwords
 *
 * Passwords are read from environment variables (see .env.example) and stored only as scrypt hashes.
 * Content IDs are deterministic, so re-seeding after editing a syllabus keeps learners' progress.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { createDb } from "../src/db/client";
import * as t from "../src/db/schema";
import { parseSyllabus } from "../src/lib/syllabus/parse";
import { hashPassword } from "../src/lib/password";
import { pathPrefix, domainId, parentId, topicId, subtopicId } from "../src/lib/syllabus/ids";

const SYLLABUS_DIR = path.resolve(process.env.SYLLABUS_DIR ?? path.join(process.cwd(), "syllabus"));

const PATHS = [
  { id: "frontend", title: "AI-Native Frontend Developer", role: "AI-Native Frontend Developer", file: "ai-native-frontend-developer.md" },
  { id: "designer", title: "AI-Native Product Designer", role: "AI-Native Product Designer", file: "ai-native-product-designer.md" },
] as const;

const USERS = [
  { name: "Aditya Sharma", pathId: "frontend", passwordEnv: "SEED_PASSWORD_ADITYA" },
  { name: "Harsh Suthar", pathId: "designer", passwordEnv: "SEED_PASSWORD_HARSH" },
] as const;

const db = createDb();
const resetPasswords = process.argv.includes("--reset-passwords");

function seedPath(p: (typeof PATHS)[number]) {
  const md = fs.readFileSync(path.join(SYLLABUS_DIR, p.file), "utf8");
  const s = parseSyllabus(md);
  const prefix = pathPrefix(p.id);

  db.transaction((tx) => {
    const oldDomains = tx.select({ id: t.domains.id }).from(t.domains).where(eq(t.domains.pathId, p.id)).all().map((d) => d.id);
    const oldTopics = tx.select({ id: t.topics.id }).from(t.topics).where(eq(t.topics.pathId, p.id)).all().map((x) => x.id);
    if (oldTopics.length) tx.delete(t.subtopics).where(inArray(t.subtopics.topicId, oldTopics)).run();
    if (oldDomains.length) {
      tx.delete(t.parentTopics).where(inArray(t.parentTopics.domainId, oldDomains)).run();
      tx.delete(t.domainPrereqs).where(inArray(t.domainPrereqs.domainId, oldDomains)).run();
    }
    tx.delete(t.topics).where(eq(t.topics.pathId, p.id)).run();
    tx.delete(t.domains).where(eq(t.domains.pathId, p.id)).run();
    tx.delete(t.resources).where(eq(t.resources.pathId, p.id)).run();

    tx.insert(t.paths)
      .values({ id: p.id, title: p.title, role: p.role, sourceFile: p.file, introMd: s.introMd, sequenceMd: s.sequenceMd, timelessMd: s.timelessMd, capstones: JSON.stringify(s.capstones) })
      .onConflictDoUpdate({
        target: t.paths.id,
        set: { title: p.title, role: p.role, sourceFile: p.file, introMd: s.introMd, sequenceMd: s.sequenceMd, timelessMd: s.timelessMd, capstones: JSON.stringify(s.capstones) },
      })
      .run();

    let topicSort = 0;
    s.domains.forEach((d, di) => {
      const dId = domainId(p.id, d.code);
      tx.insert(t.domains)
        .values({
          id: dId,
          pathId: p.id,
          code: d.code,
          title: d.title,
          stage: d.stage,
          stageNumber: d.stageNumber,
          labelText: d.labelText,
          depthText: d.depthText,
          prereqText: d.prereqText,
          whyText: d.whyText,
          notesMd: d.notesMd,
          isSpecialization: d.isSpecialization,
          isAi: d.isAi,
          sort: di,
        })
        .run();
      for (const code of d.prereqCodes) {
        if (s.domains.some((x) => x.code === code) && code !== d.code)
          tx.insert(t.domainPrereqs).values({ domainId: dId, prereqDomainId: domainId(p.id, code) }).onConflictDoNothing().run();
      }
      d.parents.forEach((par, pi) => {
        const pId = parentId(p.id, par.code);
        tx.insert(t.parentTopics).values({ id: pId, domainId: dId, code: par.code, title: par.title, tier: par.tier, sort: pi }).run();
        for (const tp of par.topics) {
          const tId = topicId(p.id, tp.code);
          tx.insert(t.topics)
            .values({ id: tId, pathId: p.id, domainId: dId, parentId: pId, code: tp.code, title: tp.title, tier: tp.tier, estMinutes: tp.estMinutes, sort: topicSort++ })
            .run();
          tp.subtopics.forEach((st, si) => {
            tx.insert(t.subtopics).values({ id: subtopicId(tId, si), topicId: tId, title: st.title, concepts: JSON.stringify(st.concepts), sort: si }).run();
          });
        }
      });
    });

    const seen = new Set<string>();
    s.resources.forEach((r, ri) => {
      if (!r.url || seen.has(r.url)) return;
      seen.add(r.url);
      const id = `${prefix}-r-${createHash("sha1").update(`${r.url}|${r.name}`).digest("hex").slice(0, 12)}`;
      const dCode = r.domainCode && s.domains.some((d) => d.code === r.domainCode) ? r.domainCode : null;
      tx.insert(t.resources)
        .values({
          id,
          pathId: p.id,
          domainId: dCode ? domainId(p.id, dCode) : null,
          section: r.section,
          category: r.category,
          name: r.name,
          type: r.type,
          creator: r.creator,
          url: r.url,
          extraUrls: JSON.stringify(r.extraUrls),
          what: r.what,
          sort: ri,
        })
        .onConflictDoNothing()
        .run();
    });
  });

  const topicCount = s.domains.reduce((n, d) => n + d.parents.reduce((m, x) => m + x.topics.length, 0), 0);
  console.log(`✓ ${p.title}: ${s.domains.length} domains, ${topicCount} topics, ${uniqueUrls(s)} resources`);
}

function uniqueUrls(s: ReturnType<typeof parseSyllabus>) {
  return new Set(s.resources.filter((r) => r.url).map((r) => r.url)).size;
}

function seedUsers() {
  for (const u of USERS) {
    const username = u.name.toLowerCase();
    const existing = db.select().from(t.users).where(eq(t.users.username, username)).get();
    const password = process.env[u.passwordEnv];
    if (!existing) {
      if (!password) {
        console.warn(`! Skipped ${u.name}: set ${u.passwordEnv} in .env.local to create this account.`);
        continue;
      }
      db.insert(t.users).values({ id: randomUUID(), name: u.name, username, passwordHash: hashPassword(password), pathId: u.pathId, createdAt: Date.now() }).run();
      console.log(`✓ Created account for ${u.name} (${u.pathId})`);
    } else {
      const updates: Partial<typeof t.users.$inferInsert> = { pathId: u.pathId, name: u.name };
      if (resetPasswords && password) updates.passwordHash = hashPassword(password);
      db.update(t.users).set(updates).where(eq(t.users.id, existing.id)).run();
      console.log(`✓ Updated account for ${u.name}${resetPasswords && password ? " (password reset)" : ""}`);
    }
  }
}

for (const p of PATHS) seedPath(p);
seedUsers();
console.log("Done.");
