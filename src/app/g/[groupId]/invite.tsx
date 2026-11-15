import { useLocalSearchParams } from "expo-router";
import type { Id } from "@convex/_generated/dataModel";
import { Invite } from "@/screens/invite";

export default function InviteRoute() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  return <Invite groupId={groupId as Id<"groups">} />;
}
