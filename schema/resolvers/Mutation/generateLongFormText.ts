import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";
import { tasks } from "@trigger.dev/sdk/v3";
import type { generateStoryTask } from "@/src/trigger/generateStoryTask";

export const generateLongFormText: NonNullable<MutationResolvers['generateLongFormText']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const goalId = args.goalId;

  // Verify the goal exists and belongs to the user
  await d1Tools.getGoal(goalId, userEmail);

  // Create a tracking job (inserted with status='RUNNING')
  const jobId = crypto.randomUUID();
  await d1Tools.createGenerationJob(jobId, userEmail, "LONGFORM", goalId);

  // Trigger the durable Trigger.dev task — survives Vercel serverless timeouts
  await tasks.trigger<typeof generateStoryTask>("generate-story", {
    jobId,
    goalId,
    userId: ctx.userId ?? userEmail,
    userEmail,
    language: args.language ?? undefined,
    minutes: args.minutes ?? undefined,
  });

  return {
    success: true,
    message: "Story generation started",
    jobId,
  };
};
