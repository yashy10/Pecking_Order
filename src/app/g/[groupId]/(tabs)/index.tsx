import { useGlobalSearchParams, useLocalSearchParams } from "expo-router";
import type { Id } from "@convex/_generated/dataModel";
import { TodayTab } from "@/screens/today-tab";

export default function TodayTabRoute() {
  // Reached by Back from a deep-linked tab, this screen gets no params of its own, so fall
  // back to the ones in the URL.
  const local = useLocalSearchParams<{ groupId: string }>();
  const global = useGlobalSearchParams<{ groupId: string }>();
  const groupId = local.groupId ?? global.groupId;
  return <TodayTab groupId={groupId as Id<"groups">} />;
}
