import { useLocalSearchParams } from "expo-router";
import type { Id } from "@convex/_generated/dataModel";
import { CrewTab } from "@/screens/crew-tab";

export default function CrewTabRoute() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  return <CrewTab groupId={groupId as Id<"groups">} />;
}
