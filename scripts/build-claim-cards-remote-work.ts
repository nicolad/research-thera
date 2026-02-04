#!/usr/bin/env tsx
/**
 * Build Claim Cards for State of Remote Work Note
 *
 * This script triggers the buildClaimCards mutation for the "state-of-remote-work" note.
 * It uses the enhanced resolver that grounds claims in actual research content.
 *
 * Usage:
 *   pnpm tsx scripts/build-claim-cards-remote-work.ts
 */

import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import { buildClaimCards } from "../schema/resolvers/Mutation/buildClaimCards";

// Load environment variables
dotenv.config();

// Suppress AI SDK warnings
if (typeof globalThis !== "undefined") {
  (globalThis as any).AI_SDK_LOG_WARNINGS = false;
}

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function main() {
  console.log("🚀 Building claim cards for state-of-remote-work note...\n");

  try {
    // 1. Get the note
    const noteResult = await client.execute({
      sql: "SELECT id, slug, content FROM notes WHERE slug = ?",
      args: ["state-of-remote-work"],
    });

    if (noteResult.rows.length === 0) {
      console.error("❌ Note 'state-of-remote-work' not found");
      console.log("\n💡 Tip: Make sure the note exists in the database");
      return;
    }

    const note = noteResult.rows[0];
    const noteId = note.id as number;
    const content = note.content as string;

    console.log(`📝 Found note: ${note.slug}`);
    console.log(`   Note ID: ${noteId}`);
    console.log(`   Content length: ${content.length} characters\n`);

    // 2. Prepare the topic/question for claim extraction
    const topic =
      "State of remote work research and trends in the post-COVID labor market";

    console.log(`🔍 Topic: ${topic}\n`);

    // 3. Call the buildClaimCards mutation
    console.log("⚙️  Building claim cards (this may take 30-60 seconds)...");
    console.log("   - Searching research APIs (Crossref, PubMed)");
    console.log(
      "   - Extracting evidence-based claims from research abstracts",
    );
    console.log("   - Mapping evidence and calculating verdicts\n");

    const result = await (buildClaimCards as any)(
      {},
      {
        input: {
          text: topic,
          perSourceLimit: 15,
          topK: 8,
          useLlmJudge: true,
          // Use only reliable sources (Crossref, PubMed)
          // Semantic Scholar excluded due to strict rate limits
          sources: ["CROSSREF", "PUBMED"],
        },
      },
      {} as any,
    );

    const cards = result.cards;

    console.log(`✅ Generated ${cards.length} claim cards!\n`);

    // 4. Display results
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Claim ${i + 1}/${cards.length}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`\n📌 ${card.claim}`);
      console.log(`\n🎯 Verdict: ${card.verdict.toUpperCase()}`);
      console.log(`💪 Confidence: ${Math.round(card.confidence * 100)}%`);
      console.log(`\n📚 Evidence (${card.evidence.length} sources):`);

      for (let j = 0; j < Math.min(3, card.evidence.length); j++) {
        const ev = card.evidence[j];
        const icon =
          ev.polarity === "supports"
            ? "✓"
            : ev.polarity === "contradicts"
              ? "✗"
              : ev.polarity === "mixed"
                ? "~"
                : "-";
        console.log(
          `\n   ${icon} [${ev.polarity.toUpperCase()}] ${ev.paper.title}`,
        );
        if (ev.paper.year) console.log(`     Year: ${ev.paper.year}`);
        if (ev.rationale) console.log(`     Rationale: ${ev.rationale}`);
        if (ev.score) console.log(`     Score: ${Math.round(ev.score * 100)}%`);
      }

      if (card.evidence.length > 3) {
        console.log(`\n   ... and ${card.evidence.length - 3} more sources`);
      }
    }

    // 5. Optional: Save claim cards to database linked to the note
    console.log("\n\n💾 Saving claim cards to database...");

    const { claimCardsTools } =
      await import("../src/mastra/tools/claim-cards.tools");

    for (const card of cards) {
      await claimCardsTools.saveClaimCard(card, noteId);
    }

    console.log(
      `✅ Saved ${cards.length} claim cards and linked to note ${noteId}`,
    );

    // 6. Summary
    const verdictCounts = cards.reduce(
      (acc: Record<string, number>, card: any) => {
        acc[card.verdict] = (acc[card.verdict] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    console.log("\n\n📊 Summary:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Total Claims: ${cards.length}`);
    console.log(`Verdicts:`);
    for (const [verdict, count] of Object.entries(verdictCounts)) {
      console.log(`  - ${verdict}: ${count}`);
    }

    const avgConfidence =
      cards.reduce((sum: number, card: any) => sum + card.confidence, 0) /
      cards.length;
    console.log(`Average Confidence: ${Math.round(avgConfidence * 100)}%`);

    const totalEvidence = cards.reduce(
      (sum: number, card: any) => sum + card.evidence.length,
      0,
    );
    console.log(`Total Evidence Sources: ${totalEvidence}`);

    console.log("\n✨ Done!");
  } catch (error) {
    console.error("\n❌ Error:", error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the script
main();
