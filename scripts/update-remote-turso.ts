/**
 * Update the note in the REMOTE Turso database
 */

import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import path from "path";

// Load environment variables from .env
dotenv.config({ path: path.join(process.cwd(), ".env") });

const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("❌ Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
  console.log("URL:", url);
  console.log("Auth Token:", authToken ? "present" : "missing");
  process.exit(1);
}

console.log("🔗 Connecting to:", url);
console.log("🔑 Auth Token:", authToken.substring(0, 20) + "...");

const turso = createClient({
  url,
  authToken,
});

async function updateRemoteNote() {
  try {
    // First, check current state
    console.log("\n📝 Current state:");
    const beforeResult = await turso.execute({
      sql: `SELECT id, entity_type, entity_id, slug, updated_at FROM notes WHERE slug = ? AND user_id = ?`,
      args: ["state-of-remote-work", "demo-user"],
    });

    if (beforeResult.rows.length === 0) {
      console.log("❌ Note not found!");
      return;
    }

    const before = beforeResult.rows[0];
    console.log(`   Entity Type: ${before.entity_type}`);
    console.log(`   Entity ID: ${before.entity_id}`);
    console.log(`   Updated At: ${before.updated_at}`);

    // Update the note
    console.log("\n🔄 Updating note...");
    await turso.execute({
      sql: `UPDATE notes SET entity_type = ?, entity_id = ?, updated_at = datetime('now') WHERE slug = ? AND user_id = ?`,
      args: ["Goal", 1, "state-of-remote-work", "demo-user"],
    });

    // Verify the update
    console.log("\n✅ After update:");
    const afterResult = await turso.execute({
      sql: `SELECT id, entity_type, entity_id, slug, updated_at FROM notes WHERE slug = ? AND user_id = ?`,
      args: ["state-of-remote-work", "demo-user"],
    });

    const after = afterResult.rows[0];
    console.log(`   Entity Type: ${after.entity_type}`);
    console.log(`   Entity ID: ${after.entity_id}`);
    console.log(`   Updated At: ${after.updated_at}`);

    console.log("\n🎯 Done!");
  } catch (error) {
    console.error("\n❌ Error:", error);
  }
}

updateRemoteNote();
