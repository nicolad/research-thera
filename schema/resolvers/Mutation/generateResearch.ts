import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";
import { generateTherapyResearchWorkflow } from "@/src/workflows/generateTherapyResearch.workflow";

export const generateResearch: NonNullable<
  MutationResolvers["generateResearch"]
> = async (_parent, args, ctx) => {
  const userId = ctx.userEmail;
  if (!userId) {
    throw new Error("Authentication required");
  }

  const { goalId } = args;
  const jobId = crypto.randomUUID();

  // Create a job record so the client can track progress
  await d1Tools.createGenerationJob(jobId, userId, "RESEARCH", goalId);

  // Fire off the workflow asynchronously — don't block the HTTP response
  generateTherapyResearchWorkflow
    .createRun()
    .then(async (run) => {
      try {
        const result = await run.start({
          inputData: { userId, goalId },
        });

        if (result.status === "success") {
          await d1Tools.updateGenerationJob(jobId, {
            status: "SUCCEEDED",
            progress: 1,
            result: { count: result.result?.count ?? 0 },
          });
        } else {
          await d1Tools.updateGenerationJob(jobId, {
            status: "FAILED",
            error: {
              message:
                (result as any).error?.message ?? "Workflow did not succeed",
            },
          });
        }
      } catch (err) {
        await d1Tools.updateGenerationJob(jobId, {
          status: "FAILED",
          error: {
            message: err instanceof Error ? err.message : String(err),
          },
        });
      }
    })
    .catch(async (err) => {
      await d1Tools.updateGenerationJob(jobId, {
        status: "FAILED",
        error: {
          message: err instanceof Error ? err.message : String(err),
        },
      });
    });

  return {
    success: true,
    message:
      "Research generation started. This may take a few minutes — check back soon.",
    jobId,
  };
};
