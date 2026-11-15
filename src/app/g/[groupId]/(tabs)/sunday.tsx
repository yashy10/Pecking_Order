import { useLocalSearchParams } from "expo-router";
import type { Id } from "@convex/_generated/dataModel";
import { CountdownTab } from "@/screens/countdown-tab";

export default function SundayTabRoute() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  return <CountdownTab groupId={groupId as Id<"groups">} />;
}
