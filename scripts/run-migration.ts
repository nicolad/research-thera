#!/usr/bin/env tsx
import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import dotenv from "dotenv";

dotenv.config();

async function runMigration() {
  const client = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  console.log("📦 Connecting to Turso database...");

  const migrationSQL = readFileSync("drizzle/0001_claim_cards.sql", "utf-8");

  // Split by semicolons and execute each statement
  const statements = migrationSQL
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("--"));

  console.log(`🔄 Executing ${statements.length} SQL statements...`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    console.log(
      `  [${i + 1}/${statements.length}] Executing: ${stmt.substring(0, 60)}...`,
    );
    try {
      await client.execute(stmt);
      console.log(`  ✅ Success`);
    } catch (error: any) {
      if (error.message?.includes("already exists")) {
        console.log(`  ⚠️  Already exists, skipping`);
      } else {
        console.error(`  ❌ Error: ${error.message}`);
        throw error;
      }
    }
  }

  console.log("\n✅ Migration completed successfully!");

  client.close();
}

runMigration().catch((error) => {
  console.error("❌ Migration failed:", error);
  process.exit(1);
});
