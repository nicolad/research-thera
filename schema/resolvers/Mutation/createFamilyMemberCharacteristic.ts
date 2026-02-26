import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const createFamilyMemberCharacteristic: NonNullable<MutationResolvers['createFamilyMemberCharacteristic']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const id = await d1Tools.createCharacteristic({
    familyMemberId: args.input.familyMemberId,
    userId: userEmail,
    category: args.input.category,
    title: args.input.title,
    description: args.input.description ?? null,
  });

  const item = await d1Tools.getCharacteristic(id, userEmail);
  if (!item) {
    throw new Error("Failed to retrieve created characteristic");
  }

  return {
    id: item.id,
    familyMemberId: item.familyMemberId,
    createdBy: item.userId,
    category: item.category as any,
    title: item.title,
    description: item.description,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  } as any;
};
