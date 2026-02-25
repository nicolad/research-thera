import type { JournalEntryResolvers } from "../types.generated";
import { d1Tools } from "@/src/db";

export const JournalEntry: JournalEntryResolvers = {
  familyMember: async (parent, _args, _ctx) => {
    if (!parent.familyMemberId) return null;

    try {
      const member = await d1Tools.getFamilyMember(parent.familyMemberId);
      return member as any;
    } catch {
      return null;
    }
  },

  goal: async (parent, _args, _ctx) => {
    if (!parent.goalId) return null;

    try {
      const goal = await d1Tools.getGoal(parent.goalId, parent.userId);
      return {
        ...goal,
        notes: [],
        research: [],
        questions: [],
        stories: [],
        userStories: [],
      } as any;
    } catch {
      return null;
    }
  },
};
