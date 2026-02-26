import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const updateFamilyMemberCharacteristic: NonNullable<MutationResolvers['updateFamilyMemberCharacteristic']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  await d1Tools.updateCharacteristic(args.id, userEmail, {
    category: args.input.category ?? undefined,
    title: args.input.title ?? undefined,
    description: args.input.description ?? undefined,
  });

  const item = await d1Tools.getCharacteristic(args.id, userEmail);
  if (!item) {
    throw new Error("Characteristic not found");
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
