import type { MutationResolvers } from "./../../types.generated";
import { d1 } from "@/src/db";

export const deleteResearch: NonNullable<
  MutationResolvers["deleteResearch"]
> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const { goalId } = args;

  // Remove note↔research links first (FK constraint)
  await d1.execute({
    sql: `DELETE FROM notes_research
          WHERE research_id IN (
            SELECT id FROM therapy_research WHERE goal_id = ?
          )`,
    args: [goalId],
  });

  // Delete the research rows themselves
  const result = await d1.execute({
    sql: `DELETE FROM therapy_research WHERE goal_id = ?`,
    args: [goalId],
  });

  const deletedCount = (result as any).rowsAffected ?? 0;

  return {
    success: true,
    message: `Deleted ${deletedCount} research paper${deletedCount !== 1 ? "s" : ""} for goal ${goalId}`,
    deletedCount,
  };
};
