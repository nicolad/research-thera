import type { GoalResolvers } from "./../types.generated";
import { tursoTools } from "@/src/mastra/tools/turso.tools";

export const Goal: GoalResolvers = {
  research: async (parent, _args, _ctx) => {
    const research = await tursoTools.listTherapyResearch(parent.id);
    return research;
  },

  notes: async (parent, _args, _ctx) => {
    const notes = await tursoTools.listNotesForEntity(
      parent.id,
      "Goal",
      parent.userId
    );
    return notes;
  },

  // questions, stories, and therapeuticText fields are handled by the database layer
};