import type { StoryResolvers } from "./../types.generated";
import { tursoTools } from "@/src/db";

export const Story: StoryResolvers = {
  goal: async (parent, _args, ctx) => {
    const userEmail = ctx.userEmail;
    if (!userEmail) {
      return null;
    }

    try {
      const goal = await tursoTools.getGoal(parent.goalId, userEmail);
      return {
        ...goal,
        notes: [],
        research: [],
        questions: [],
        stories: [],
        userStories: [],
      } as any;
    } catch (error) {
      return null;
    }
  },
};
