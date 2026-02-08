import type { QueryResolvers } from "./../../types.generated";
import { tursoTools } from "@/src/mastra/tools/turso.tools";

export const research: NonNullable<QueryResolvers['research']> = async (
  _parent,
  args,
  _ctx,
) => {
  const researchList = await tursoTools.listTherapyResearch(args.goalId);
  return researchList;
};
