import { useLocalSearchParams } from "expo-router";
import type { Id } from "@convex/_generated/dataModel";
import { TodayTab } from "@/screens/today-tab";

export default function TodayTabRoute() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  return <TodayTab groupId={groupId as Id<"groups">} />;
}
