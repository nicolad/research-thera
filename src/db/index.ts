import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import path from "path";
import * as schema from "./schema";
import { turso } from "./turso";

let dbInstance: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  if (!process.env.TURSO_DATABASE_URL) {
    throw new Error("TURSO_DATABASE_URL environment variable is required");
  }

  const url = process.env.TURSO_DATABASE_URL.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

  const client = createClient({
    url,
    authToken,
  });

  dbInstance = drizzle(client, { schema });
  return dbInstance;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    const instance = getDb();
    return (instance as any)[prop];
  },
});

export async function updateGoal(
  goalId: number,
  userId: string,
  updates: {
    slug?: string;
    title?: string;
    description?: string | null;
    targetDate?: string | null;
    status?: string;
    priority?: string;
  },
) {
  const fields: string[] = [];
  const args: any[] = [];

  if (updates.slug !== undefined) {
    fields.push("slug = ?");
    args.push(updates.slug);
  }

  if (updates.title !== undefined) {
    fields.push("title = ?");
    args.push(updates.title);
  }

  if (updates.description !== undefined) {
    fields.push("description = ?");
    args.push(updates.description);
  }

  if (updates.targetDate !== undefined) {
    fields.push("target_date = ?");
    args.push(updates.targetDate);
  }

  if (updates.status !== undefined) {
    fields.push("status = ?");
    args.push(updates.status);
  }

  if (updates.priority !== undefined) {
    fields.push("priority = ?");
    args.push(updates.priority);
  }

  fields.push("updated_at = datetime('now')");
  args.push(goalId, userId);

  await turso.execute({
    sql: `UPDATE goals SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
    args,
  });
}
