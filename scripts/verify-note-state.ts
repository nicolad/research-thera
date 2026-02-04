/**
 * Verify current note state
 */

import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const turso = createClient({ url: url!, authToken: authToken! });

async function checkNote() {
  const result = await turso.execute({
    sql: `SELECT id, slug, title, updated_at FROM notes WHERE slug = ? AND user_id = ?`,
    args: ["state-of-remote-work", "demo-user"],
  });

  if (result.rows.length > 0) {
    const note = result.rows[0];
    console.log("✅ Current note state:");
    console.log(`   ID: ${note.id}`);
    console.log(`   Slug: ${note.slug}`);
    console.log(`   Title: ${note.title}`);
    console.log(`   Updated: ${note.updated_at}`);
  } else {
    console.log("❌ Note not found");
  }
}

checkNote();
