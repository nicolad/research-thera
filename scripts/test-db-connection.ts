/**
 * Test database connection directly to verify we're reading from the correct database
 */

import { createClient } from "@libsql/client";
import path from "path";

const url =
  process.env.TURSO_DATABASE_URL ||
  process.env.DATABASE_URL ||
  `file:${path.join(process.cwd(), "therapeutic.db")}`;
const authToken = process.env.TURSO_AUTH_TOKEN;

console.log("🔗 Database URL:", url);
console.log("🔑 Auth Token:", authToken ? `${authToken.substring(0, 20)}...` : "none");

const turso = createClient({
  url,
  authToken,
});

async function testConnection() {
  try {
    // Test the connection
    const result = await turso.execute({
      sql: `SELECT * FROM notes WHERE slug = ? AND user_id = ?`,
      args: ["state-of-remote-work", "demo-user"],
    });

    console.log("\n📝 Query result:");
    console.log(`   Rows found: ${result.rows.length}`);
    
    if (result.rows.length > 0) {
      const row = result.rows[0];
      console.log(`\n   ID: ${row.id}`);
      console.log(`   Entity Type: ${row.entity_type}`);
      console.log(`   Entity ID: ${row.entity_id}`);
      console.log(`   Slug: ${row.slug}`);
      console.log(`   User ID: ${row.user_id}`);
      console.log(`   Updated At: ${row.updated_at}`);
    }
  } catch (error) {
    console.error("\n❌ Error:", error);
  }
}

testConnection();
