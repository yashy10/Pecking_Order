import { useLocalSearchParams } from "expo-router";
import type { Id } from "@convex/_generated/dataModel";
import { GroupHub } from "@/screens/group-hub";

export default function GroupRoute() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  return <GroupHub groupId={groupId as Id<"groups">} />;
}
