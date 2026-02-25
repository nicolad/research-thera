import type { MutationResolvers } from "../../types.generated";
import { d1Tools } from "@/src/db";

export const updateJournalEntry: NonNullable<MutationResolvers['updateJournalEntry']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  await d1Tools.updateJournalEntry(args.id, userEmail, {
    title: args.input.title ?? undefined,
    content: args.input.content ?? undefined,
    mood: args.input.mood ?? undefined,
    moodScore: args.input.moodScore ?? undefined,
    tags: args.input.tags || undefined,
    goalId: args.input.goalId ?? undefined,
    familyMemberId: args.input.familyMemberId ?? undefined,
    isPrivate: args.input.isPrivate ?? undefined,
    entryDate: args.input.entryDate ?? undefined,
  });

  const entry = await d1Tools.getJournalEntry(args.id, userEmail);
  if (!entry) {
    throw new Error("Journal entry not found");
  }

  return entry as any;
};
