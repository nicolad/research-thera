import type { MutationResolvers } from "./../../types.generated";
import { d1 } from "@/src/db";

export const deleteTherapeuticQuestions: NonNullable<
  MutationResolvers["deleteTherapeuticQuestions"]
> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const { goalId } = args;

  const result = await d1.execute({
    sql: `DELETE FROM therapeutic_questions WHERE goal_id = ?`,
    args: [goalId],
  });

  const deletedCount = (result as any).rowsAffected ?? 0;

  return {
    success: true,
    message: `Deleted ${deletedCount} question${deletedCount !== 1 ? "s" : ""} for goal ${goalId}`,
    deletedCount,
  };
};
