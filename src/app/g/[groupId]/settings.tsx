import { useLocalSearchParams } from "expo-router";
import type { Id } from "@convex/_generated/dataModel";
import { GroupSettings } from "@/screens/group-settings";

export default function GroupSettingsRoute() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  return <GroupSettings groupId={groupId as Id<"groups">} />;
}
