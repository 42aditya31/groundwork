import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { db, t } from "@/db";
import { databasePath } from "@/db/client";
import { DUMMY_HASH, verifyPassword } from "@/lib/password";

/**
 * Cookies on localhost are shared across ports, so the cookie name is scoped to the database file.
 * That keeps a test server and the real app from overwriting each other's sign-in.
 */
export const SESSION_COOKIE = `gw_session_${createHash("sha256").update(databasePath()).digest("hex").slice(0, 8)}`;
const SESSION_DAYS = 60;
const RENEW_WHEN_DAYS_LEFT = 45;
const MAX_FAILED = 5;
const LOCK_WINDOW_MS = 15 * 60 * 1000;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export type SessionUser = {
  id: string;
  name: string;
  pathId: string;
  timezone: string;
  theme: string;
  hoursWeekday: number | null;
  hoursWeekend: number | null;
  onboardedAt: number | null;
  lastPlanDate: string | null;
  planNote: string | null;
};

/** Verifies credentials server-side with rate limiting. Returns the user id or an error message. */
export function verifyCredentials(usernameRaw: string, password: string): { userId: string } | { error: string } {
  const username = usernameRaw.trim().replace(/\s+/g, " ").toLowerCase();
  const since = Date.now() - LOCK_WINDOW_MS;
  const recentFailures = db
    .select()
    .from(t.loginAttempts)
    .where(and(eq(t.loginAttempts.username, username), eq(t.loginAttempts.success, false), gt(t.loginAttempts.at, since)))
    .all().length;
  if (recentFailures >= MAX_FAILED) return { error: "Too many attempts. Wait 15 minutes, then try again." };

  const user = db.select().from(t.users).where(eq(t.users.username, username)).get();
  const ok = verifyPassword(password, user?.passwordHash ?? DUMMY_HASH) && !!user;
  db.insert(t.loginAttempts).values({ username, success: ok, at: Date.now() }).run();
  if (!ok || !user) return { error: "That username and password don't match. Check both and try again." };
  return { userId: user.id };
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + SESSION_DAYS * 86_400_000;
  db.insert(t.sessions).values({ id: hashToken(token), userId, expiresAt, createdAt: Date.now() }).run();
  db.delete(t.sessions).where(lt(t.sessions.expiresAt, Date.now())).run();
  await setSessionCookie(token, expiresAt);
}

async function setSessionCookie(token: string, expiresAt: number) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

/**
 * Sliding expiry: called from server actions (where cookies may be written). Active learners stay
 * signed in; a session only ends after ${SESSION_DAYS} days without any saved activity, or on log out.
 */
export async function renewSessionIfNeeded() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return;
  const id = hashToken(token);
  const row = db.select().from(t.sessions).where(eq(t.sessions.id, id)).get();
  if (!row || row.expiresAt < Date.now()) return;
  if (row.expiresAt - Date.now() > RENEW_WHEN_DAYS_LEFT * 86_400_000) return;
  const expiresAt = Date.now() + SESSION_DAYS * 86_400_000;
  db.update(t.sessions).set({ expiresAt }).where(eq(t.sessions.id, id)).run();
  await setSessionCookie(token, expiresAt);
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) db.delete(t.sessions).where(eq(t.sessions.id, hashToken(token))).run();
  jar.delete(SESSION_COOKIE);
}

/** Reads and validates the session cookie. Memoized per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = db
    .select({
      id: t.users.id,
      name: t.users.name,
      pathId: t.users.pathId,
      timezone: t.users.timezone,
      theme: t.users.theme,
      hoursWeekday: t.users.hoursWeekday,
      hoursWeekend: t.users.hoursWeekend,
      onboardedAt: t.users.onboardedAt,
      lastPlanDate: t.users.lastPlanDate,
      planNote: t.users.planNote,
      expiresAt: t.sessions.expiresAt,
    })
    .from(t.sessions)
    .innerJoin(t.users, eq(t.users.id, t.sessions.userId))
    .where(eq(t.sessions.id, hashToken(token)))
    .get();
  if (!row || row.expiresAt < Date.now()) return null;
  const { expiresAt: _expires, ...user } = row;
  void _expires;
  return user;
});

/** For pages and actions: returns the signed-in user or redirects to the login screen. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** For pages inside the app: also requires the onboarding step to be completed. */
export async function requireOnboardedUser(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.onboardedAt || !user.hoursWeekday) redirect("/welcome");
  return user;
}
