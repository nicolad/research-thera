/**
 * Build Claim Cards Using Linked Research Corpus
 *
 * This script demonstrates how to use the 182 linked research papers
 * as a fixed corpus for claim generation instead of doing fresh searches.
 *
 * Usage:
 *   pnpm tsx scripts/build-claim-cards-with-linked-research.ts
 */

import { claimCardsTools } from "../src/mastra/tools/claim-cards.tools";
import { turso } from "../src/db/turso";
import { sourceTools } from "../src/mastra/tools/sources.tools";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const noteSlug = "state-of-remote-work";
  const noteId = 1; // Update this to match your note ID
  const topic =
    "State of remote work research and trends in the post-COVID labor market";

  console.log(
    `🚀 Building claim cards for ${noteSlug} note using LINKED RESEARCH corpus...`,
  );
  console.log(`   Note ID: ${noteId}`);
  console.log(`   Topic: ${topic}\n`);

  try {
    // Load linked research for this note
    console.log(`📚 Loading linked research for note...`);
    const res = await turso.execute({
      sql: `
        SELECT
          r.id as id,
          r.title as title,
          r.year as year,
          r.doi as doi,
          r.url as url,
          r.authors as authors,
          r.abstract as abstract,
          r.journal as journal
        FROM therapy_research r
        INNER JOIN notes_research nr ON nr.research_id = r.id
        WHERE nr.note_id = ?
        ORDER BY r.year DESC
      `,
      args: [noteId],
    });

    const pool = res.rows.map((r: any) => ({
      title: String(r.title),
      year: r.year != null ? Number(r.year) : undefined,
      doi: r.doi ? String(r.doi) : undefined,
      url: r.url ? String(r.url) : undefined,
      source: "linked" as const,
      authors: r.authors ? JSON.parse(String(r.authors)) : undefined,
      abstract: r.abstract ? String(r.abstract) : undefined,
      journal: r.journal ? String(r.journal) : undefined,
    }));

    console.log(`   ✓ Loaded ${pool.length} linked papers\n`);

    if (pool.length === 0) {
      console.error(
        `❌ No linked research found for note ${noteId}. Please link research papers first.`,
      );
      process.exit(1);
    }

    // Enrich pool to get abstracts
    console.log(`📄 Enriching paper details...`);
    const poolDetails = await sourceTools.mapLimit(pool, 3, async (p) =>
      sourceTools.fetchPaperDetails(p),
    );
    console.log(`   ✓ Enriched ${poolDetails.length} papers\n`);

    // Extract claims from the corpus
    console.log(`🤖 Extracting claims from linked corpus...`);

    // For demonstration, use a few example claims
    // In production, you would implement batched claim extraction from the corpus
    const extractedClaims = [
      "Remote work implementation requires organizational support structures including formal procedures and evaluation systems",
      "COVID-19 pandemic forced many organizations to implement remote work without prior analysis",
      "Post-COVID remote work scenarios present specific cybersecurity threats",
    ];

    console.log(`   ✓ Using ${extractedClaims.length} claims\n`);

    const cards = await claimCardsTools.buildClaimCardsFromClaims(
      extractedClaims,
      {
        topK: 12, // Use more evidence per claim
        useLlmJudge: true, // Use DeepSeek to judge evidence
        paperPool: pool, // ✅ Use the linked research corpus
        enrichPool: false, // Already enriched above
        poolConcurrency: 3,
      },
    );

    console.log(`\n💾 Saving ${cards.length} claim cards to database...`);
    for (const card of cards) {
      await claimCardsTools.saveClaimCard(card, noteId);
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Generated ${cards.length} claim cards!`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // Display summary of claims
    cards.forEach((card: any, idx: number) => {
      console.log(`Claim ${idx + 1}/${cards.length}`);
      console.log(`📌 ${card.claim}`);
      console.log(
        `🎯 Verdict: ${card.verdict} (${Math.round(card.confidence * 100)}% confidence)`,
      );
      console.log(`📚 Evidence: ${card.evidence.length} sources\n`);
    });

    console.log(`\n✨ Claims are saved to database and linked to note #${noteId}`);
    console.log(`   View them at: /notes/${noteSlug}\n`);
  } catch (error) {
    console.error("❌ Error building claim cards:", error);
    process.exit(1);
  }
}

main();
