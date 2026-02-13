import "dotenv/config";
import { turso } from "../src/db/turso";

async function addNoteSharesTable() {
  try {
    console.log("Creating note_shares table...");
    
    // Check if table exists
    const checkTable = await turso.execute(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='note_shares'
    `);
    
    if (checkTable.rows.length > 0) {
      console.log("✅ note_shares table already exists");
    } else {
      // Create the table
      await turso.execute(`
        CREATE TABLE note_shares (
          note_id INTEGER NOT NULL,
          email TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'READER' CHECK (role IN ('READER','EDITOR')),
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          created_by TEXT NOT NULL,
          PRIMARY KEY (note_id, email),
          FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
        )
      `);
      
      console.log("✅ note_shares table created");
      
      // Create indexes
      await turso.execute(`
        CREATE INDEX IF NOT EXISTS idx_note_shares_email ON note_shares(email)
      `);
      
      await turso.execute(`
        CREATE INDEX IF NOT EXISTS idx_note_shares_note_id ON note_shares(note_id)
      `);
      
      console.log("✅ Indexes created");
    }
    
    // Check if visibility column exists
    const checkColumn = await turso.execute(`
      PRAGMA table_info(notes)
    `);
    
    const hasVisibility = checkColumn.rows.some((row: any) => row.name === 'visibility');
    
    if (hasVisibility) {
      console.log("✅ visibility column already exists");
    } else {
      await turso.execute(`
        ALTER TABLE notes ADD COLUMN visibility TEXT NOT NULL DEFAULT 'PRIVATE' CHECK (visibility IN ('PRIVATE','PUBLIC'))
      `);
      console.log("✅ visibility column added");
      
      await turso.execute(`
        CREATE INDEX IF NOT EXISTS idx_notes_visibility ON notes(visibility)
      `);
      console.log("✅ visibility index created");
    }
    
    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

addNoteSharesTable();
