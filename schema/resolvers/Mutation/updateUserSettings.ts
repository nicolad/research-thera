import type { MutationResolvers } from "./../../types.generated";
import { upsertUserSettings } from "@/src/db";

export const updateUserSettings: NonNullable<MutationResolvers['updateUserSettings']> = async (_parent, args, ctx) => {
  const userId = ctx.userId;
  if (!userId) {
    throw new Error("Authentication required");
  }

  const settings = await upsertUserSettings(userId, args.storyLanguage);

  return {
    userId: settings.userId,
    storyLanguage: settings.storyLanguage,
  };
};
