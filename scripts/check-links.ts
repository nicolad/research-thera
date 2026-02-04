import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function checkLinks() {
  console.log("URL:", process.env.TURSO_DATABASE_URL);

  const result = await client.execute(
    "SELECT COUNT(*) as count FROM notes_research WHERE note_id = 1",
  );
  console.log("Links found:", result.rows[0].count);

  const result2 = await client.execute(
    "SELECT COUNT(*) as count FROM therapy_research",
  );
  console.log("Research papers found:", result2.rows[0].count);

  // Check abstract status
  const result3 = await client.execute(
    "SELECT COUNT(*) as count FROM therapy_research WHERE abstract IS NOT NULL AND abstract != '' AND abstract != 'Abstract not available'",
  );
  console.log("Papers with valid abstracts:", result3.rows[0].count);

  // Sample a few papers
  const sample = await client.execute(
    "SELECT id, title, doi, abstract FROM therapy_research LIMIT 5",
  );
  console.log("\nSample papers:");
  for (const row of sample.rows) {
    console.log(`\nID: ${row.id}`);
    console.log(`Title: ${String(row.title).substring(0, 80)}...`);
    console.log(`DOI: ${row.doi || "NO DOI"}`);
    console.log(
      `Abstract: ${row.abstract ? String(row.abstract).substring(0, 100) + "..." : "NULL"}`,
    );
  }
}

checkLinks().then(() => process.exit(0));
