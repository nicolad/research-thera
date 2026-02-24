import type { FamilyMemberResolvers } from "./../types.generated";
import { d1Tools } from "@/src/db";

export const FamilyMember: FamilyMemberResolvers = {
  goals: async (parent, _args, _ctx) => {
    const goals = await d1Tools.listGoals(parent.userId, parent.id);
    return goals.map((goal) => ({
      ...goal,
      questions: [],
      stories: [],
      userStories: [],
      notes: [],
      research: [],
    })) as any;
  },
  shares: async (parent, _args, _ctx) => {
    const shares = await d1Tools.getFamilyMemberShares(parent.id);
    return shares.map((s) => ({ ...s, role: s.role as any }));
  },
};
