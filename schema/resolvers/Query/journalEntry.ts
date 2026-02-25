import type { QueryResolvers } from "../../types.generated";
import { d1Tools } from "@/src/db";

export const journalEntry: NonNullable<QueryResolvers['journalEntry']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const entry = await d1Tools.getJournalEntry(args.id, userEmail);
  if (!entry) return null;

  return entry as any;
};
