/**
 * Claim Cards Usage Examples
 *
 * Run with: npx tsx examples/claim-cards-example.ts
 */

import { claimCardsTools } from "../src/mastra/tools/claim-cards.tools";

async function example1_ExtractAndVerifyClaims() {
  console.log(
    "=== Example 1: Extract claims from text and verify with evidence ===\n",
  );

  const text = `
    Cognitive Behavioral Therapy (CBT) is highly effective for treating anxiety disorders.
    Studies show that CBT reduces anxiety symptoms by 60-80% in most patients.
    Exposure therapy, a component of CBT, is particularly effective for PTSD.
    The effects of CBT are long-lasting, with benefits persisting for years after treatment.
  `;

  // Extract atomic claims
  const claims = await claimCardsTools.extractClaims(text);
  console.log("Extracted claims:");
  claims.forEach((claim, i) => console.log(`${i + 1}. ${claim}`));
  console.log();

  // Build claim cards with evidence from research databases
  console.log("Building claim cards with evidence...\n");
  const cards = await claimCardsTools.buildClaimCardsFromClaims(
    claims.slice(0, 2),
    {
      perSourceLimit: 5,
      topK: 3,
      useLlmJudge: false, // Set to true to use LLM for evidence judging
      sources: ["crossref", "semantic_scholar"],
    },
  );

  // Display results
  for (const card of cards) {
    console.log(`Claim: ${card.claim}`);
    console.log(
      `Verdict: ${card.verdict} (confidence: ${(card.confidence * 100).toFixed(0)}%)`,
    );
    console.log(`Evidence count: ${card.evidence.length}`);
    console.log(`Sources used: ${card.provenance.sourceTools.join(", ")}`);

    if (card.evidence.length > 0) {
      console.log("\nTop evidence:");
      card.evidence.slice(0, 2).forEach((e, i) => {
        console.log(`  ${i + 1}. ${e.paper.title}`);
        console.log(
          `     Authors: ${e.paper.authors?.join(", ") || "Unknown"}`,
        );
        console.log(`     DOI: ${e.paper.doi || "N/A"}`);
        console.log(`     Score: ${(e.score || 0).toFixed(2)}`);
      });
    }
    console.log("\n" + "=".repeat(80) + "\n");
  }
}

async function example2_SaveAndRetrieveClaimCards() {
  console.log("=== Example 2: Save claim cards to database ===\n");

  const claims = [
    "Mindfulness meditation reduces stress in adults with generalized anxiety disorder",
  ];

  const cards = await claimCardsTools.buildClaimCardsFromClaims(claims, {
    perSourceLimit: 3,
    topK: 2,
    sources: ["semantic_scholar"],
  });

  if (cards.length === 0) {
    console.log("No cards generated");
    return;
  }

  const card = cards[0];

  // Save to database (optionally linked to a note)
  console.log("Saving claim card to database...");
  await claimCardsTools.saveClaimCard(card, undefined); // Pass noteId to link to a note

  console.log(`Saved: ${card.id}\n`);

  // Retrieve from database
  const retrieved = await claimCardsTools.getClaimCard(card.id);
  if (retrieved) {
    console.log("Retrieved claim card:");
    console.log(`  Claim: ${retrieved.claim}`);
    console.log(`  Verdict: ${retrieved.verdict}`);
    console.log(`  Confidence: ${(retrieved.confidence * 100).toFixed(0)}%`);
    console.log(`  Evidence: ${retrieved.evidence.length} papers`);
  }

  // Clean up
  await claimCardsTools.deleteClaimCard(card.id);
  console.log("\nCleaned up example data");
}

async function example3_DirectTextToClaims() {
  console.log("=== Example 3: One-step text to claim cards ===\n");

  const text =
    "Exercise therapy improves mood and reduces depressive symptoms in adults with major depressive disorder.";

  // Extract claims and build cards in one call
  const cards = await claimCardsTools.buildClaimCardsFromText(text, {
    perSourceLimit: 3,
    topK: 2,
    sources: ["pubmed", "semantic_scholar"],
  });

  console.log(`Generated ${cards.length} claim card(s)\n`);

  for (const card of cards) {
    console.log(`Claim: ${card.claim}`);
    console.log(`Verdict: ${card.verdict}`);
    console.log(`Confidence: ${(card.confidence * 100).toFixed(0)}%`);
    console.log(`Evidence papers: ${card.evidence.length}`);

    if (card.evidence[0]?.excerpt) {
      console.log(`\nSample excerpt:\n"${card.evidence[0].excerpt}"`);
    }
    console.log();
  }
}

async function example4_RefreshExistingCard() {
  console.log("=== Example 4: Refresh evidence for existing claim ===\n");

  // Create initial card
  const claims = ["CBT is effective for anxiety treatment"];
  const [initialCard] = await claimCardsTools.buildClaimCardsFromClaims(
    claims,
    {
      perSourceLimit: 2,
      topK: 1,
    },
  );

  console.log("Initial card:");
  console.log(`  Verdict: ${initialCard.verdict}`);
  console.log(`  Evidence: ${initialCard.evidence.length} papers`);
  console.log();

  // Refresh with more sources and higher limits
  console.log("Refreshing with expanded search...");
  const refreshed = await claimCardsTools.refreshClaimCard(initialCard, {
    perSourceLimit: 5,
    topK: 4,
    sources: ["crossref", "pubmed", "semantic_scholar"],
  });

  console.log("\nRefreshed card:");
  console.log(`  Verdict: ${refreshed.verdict}`);
  console.log(`  Evidence: ${refreshed.evidence.length} papers`);
  console.log(`  Same ID: ${refreshed.id === initialCard.id}`);
}

// Run examples
async function main() {
  try {
    await example1_ExtractAndVerifyClaims();
    // await example2_SaveAndRetrieveClaimCards();
    // await example3_DirectTextToClaims();
    // await example4_RefreshExistingCard();
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
