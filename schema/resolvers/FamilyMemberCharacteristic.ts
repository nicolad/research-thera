import type { FamilyMemberCharacteristicResolvers } from "./../types.generated";
import { d1Tools } from "@/src/db";

export const FamilyMemberCharacteristic: FamilyMemberCharacteristicResolvers = {
  familyMember: async (parent, _args, ctx) => {
    const userEmail = ctx.userEmail;
    if (!userEmail) return null;
    const member = await d1Tools.getFamilyMember(parent.familyMemberId);
    if (!member) return null;
    return member as any;
  },
};
