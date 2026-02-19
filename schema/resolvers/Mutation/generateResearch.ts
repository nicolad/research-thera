import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";
import { generateTherapyResearchWorkflow } from "@/src/workflows/generateTherapyResearch.workflow";

export const generateResearch: NonNullable<
  MutationResolvers["generateResearch"]
> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const goalId = args.goalId;

  // Verify the goal exists and belongs to the user
  await d1Tools.getGoal(goalId, userEmail);

  // Create a tracking job
  const jobId = crypto.randomUUID();
  await d1Tools.createGenerationJob(jobId, userEmail, "RESEARCH", goalId);

  // Fire-and-forget the workflow
  const run = await generateTherapyResearchWorkflow.createRun();
  run
    .start({ inputData: { userId: userEmail, goalId } })
    .then(async (result) => {
      if (result.status === "success") {
        await d1Tools.updateGenerationJob(jobId, {
          status: "SUCCEEDED",
          progress: 100,
          result: JSON.stringify(result.result),
        });
      } else {
        await d1Tools.updateGenerationJob(jobId, {
          status: "FAILED",
          error: JSON.stringify({
            message: "Workflow did not succeed",
            details: String(result.status),
          }),
        });
      }
    })
    .catch(async (err) => {
      await d1Tools.updateGenerationJob(jobId, {
        status: "FAILED",
        error: JSON.stringify({
          message: err instanceof Error ? err.message : String(err),
        }),
      });
    });

  return {
    success: true,
    message: "Research generation started",
    jobId,
  };
};
