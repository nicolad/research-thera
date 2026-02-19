import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const updateSubgoal: NonNullable<MutationResolvers['updateSubgoal']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const subgoal = await d1Tools.updateSubgoal(args.id, userEmail, {
    title: args.input.title ?? undefined,
    description: args.input.description ?? undefined,
    status: args.input.status ?? undefined,
  });
  if (!subgoal) {
    throw new Error("Failed to update subgoal");
  }

  return subgoal;
};
