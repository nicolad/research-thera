import "dotenv/config";
import { turso } from "../src/db/turso";

async function updateNoteVisibility() {
  try {
    console.log("Updating note visibility to PUBLIC...\n");
    
    const result = await turso.execute({
      sql: `UPDATE notes SET visibility = 'PUBLIC' WHERE slug = ?`,
      args: ["state-of-remote-work"],
    });
    
    console.log(`✅ Updated ${result.rowsAffected} note(s)`);
    
    // Verify the update
    const check = await turso.execute({
      sql: `SELECT id, title, slug, visibility FROM notes WHERE slug = ?`,
      args: ["state-of-remote-work"],
    });
    
    if (check.rows.length > 0) {
      const note = check.rows[0];
      console.log("\n✅ Verified:");
      console.log(`  ID: ${note.id}`);
      console.log(`  Title: ${note.title}`);
      console.log(`  Slug: ${note.slug}`);
      console.log(`  Visibility: ${note.visibility}`);
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

updateNoteVisibility();
