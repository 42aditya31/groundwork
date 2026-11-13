import "server-only";
import { createDb } from "./client";

const globalForDb = globalThis as unknown as { __groundworkDb?: ReturnType<typeof createDb> };

export const db = globalForDb.__groundworkDb ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.__groundworkDb = db;

export * as t from "./schema";
