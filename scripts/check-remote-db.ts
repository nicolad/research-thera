/**
 * Check the actual state of the remote database
 */

import { tursoTools } from "@/src/mastra/tools/turso.tools";

async function main() {
  const userId = "demo-user";

  console.log("🔍 Checking remote database state...\n");

  // Query the note directly
  const noteBySlug = await tursoTools.getNoteBySlug("state-of-remote-work", userId);
  
  console.log("📝 Note by slug 'state-of-remote-work':");
  if (noteBySlug) {
    console.log(`   ID: ${noteBySlug.id}`);
    console.log(`   Entity Type: ${noteBySlug.entityType}`);
    console.log(`   Entity ID: ${noteBySlug.entityId}`);
    console.log(`   Tags: ${noteBySlug.tags.join(", ")}`);
    console.log(`   Created: ${noteBySlug.createdAt}`);
    console.log(`   Updated: ${noteBySlug.updatedAt}`);
  } else {
    console.log("   NOT FOUND");
  }

  // Also try direct SQL query
  console.log("\n🔍 Direct SQL query:");
  const result = await tursoTools.turso.execute({
    sql: `SELECT id, entity_type, entity_id, slug, user_id FROM notes WHERE slug = ? OR id = 1`,
    args: ["state-of-remote-work"],
  });

  console.log(`   Found ${result.rows.length} row(s):`);
  result.rows.forEach((row) => {
    console.log(`   - ID: ${row.id}, Entity: ${row.entity_type}/${row.entity_id}, Slug: ${row.slug}, User: ${row.user_id}`);
  });

  // Check if goal exists
  console.log("\n🎯 Checking goal existence:");
  try {
    const goal = await tursoTools.getGoal(1, userId);
    console.log(`   Goal #1 exists: ${goal.title}`);
  } catch (error) {
    console.log(`   Goal #1 NOT FOUND: ${error}`);
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
