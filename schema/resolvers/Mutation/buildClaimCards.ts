import type { MutationResolvers } from "../../types.generated";
import { claimCardsTools } from "../../../src/mastra/tools/claim-cards.tools";

export const buildClaimCards: NonNullable<
  MutationResolvers["buildClaimCards"]
> = async (_parent, { input }) => {
  const { text, claims, perSourceLimit, topK, useLlmJudge, sources } = input;

  // Map GraphQL enums to lowercase source names
  const sourcesLowercase = sources?.map((s) => s.toLowerCase()) as any[];

  let cards;
  if (text) {
    cards = await claimCardsTools.buildClaimCardsFromText(text, {
      perSourceLimit: perSourceLimit ?? undefined,
      topK: topK ?? undefined,
      useLlmJudge: useLlmJudge ?? undefined,
      sources: sourcesLowercase,
    });
  } else if (claims && claims.length > 0) {
    cards = await claimCardsTools.buildClaimCardsFromClaims(claims, {
      perSourceLimit: perSourceLimit ?? undefined,
      topK: topK ?? undefined,
      useLlmJudge: useLlmJudge ?? undefined,
      sources: sourcesLowercase,
    });
  } else {
    throw new Error("Must provide either text or claims");
  }

  return { cards } as any;
};
