import type { MutationResolvers } from "../../types.generated";
import { d1Tools } from "@/src/db";

export const createJournalEntry: NonNullable<MutationResolvers['createJournalEntry']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const id = await d1Tools.createJournalEntry({
    userId: userEmail,
    familyMemberId: args.input.familyMemberId ?? null,
    title: args.input.title ?? null,
    content: args.input.content,
    mood: args.input.mood ?? null,
    moodScore: args.input.moodScore ?? null,
    tags: args.input.tags || [],
    goalId: args.input.goalId ?? null,
    isPrivate: args.input.isPrivate !== false,
    entryDate: args.input.entryDate,
  });

  const entry = await d1Tools.getJournalEntry(id, userEmail);
  if (!entry) {
    throw new Error("Failed to retrieve created journal entry");
  }

  return entry as any;
};
