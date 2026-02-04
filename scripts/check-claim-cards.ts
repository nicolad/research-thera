import { config } from "dotenv";
config();

import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { claimCards, notesClaims } from "../src/db/schema";
import { eq } from "drizzle-orm";

const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url: url!, authToken: authToken! });
const db = drizzle(client);

async function checkClaimCards() {
  console.log("🔍 Checking claim cards in database...\n");

  // Check all claim cards
  const allCards = await db.select().from(claimCards);
  console.log(`Found ${allCards.length} total claim cards\n`);

  // Check claim cards linked to notes
  const linkedCards = await db
    .select({
      noteId: notesClaims.noteId,
      claimId: notesClaims.claimId,
      claim: claimCards.claim,
      verdict: claimCards.verdict,
    })
    .from(notesClaims)
    .innerJoin(claimCards, eq(notesClaims.claimId, claimCards.id));

  console.log(`Found ${linkedCards.length} claim cards linked to notes\n`);

  if (linkedCards.length > 0) {
    console.log("Linked claim cards:");
    linkedCards.forEach((card) => {
      console.log(`  Note #${card.noteId}: ${card.claim.slice(0, 80)}...`);
      console.log(`  Verdict: ${card.verdict}`);
      console.log(`  ---`);
    });
  }

  // Check for note ID 1 specifically
  const note1Cards = await db
    .select()
    .from(notesClaims)
    .where(eq(notesClaims.noteId, 1));

  console.log(`\nNote #1 has ${note1Cards.length} claim cards linked`);
}

checkClaimCards()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
