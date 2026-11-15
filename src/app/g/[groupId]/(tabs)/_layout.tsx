import { useLocalSearchParams } from "expo-router";
import type { Id } from "@convex/_generated/dataModel";
import { GroupTabs } from "@/screens/group-tabs";

export default function GroupTabsLayout() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  return <GroupTabs groupId={groupId as Id<"groups">} />;
}
