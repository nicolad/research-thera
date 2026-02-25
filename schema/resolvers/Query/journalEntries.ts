import type { QueryResolvers } from "../../types.generated";
import { d1Tools } from "@/src/db";

export const journalEntries: NonNullable<QueryResolvers['journalEntries']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const entries = await d1Tools.listJournalEntries(userEmail, {
    familyMemberId: args.familyMemberId ?? undefined,
    goalId: args.goalId ?? undefined,
    mood: args.mood ?? undefined,
    fromDate: args.fromDate ?? undefined,
    toDate: args.toDate ?? undefined,
  });

  return entries as any;
};
