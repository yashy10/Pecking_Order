import { useGlobalSearchParams, useLocalSearchParams } from "expo-router";
import type { Id } from "@convex/_generated/dataModel";
import { CountdownTab } from "@/screens/countdown-tab";

export default function SundayTabRoute() {
  // Reached by Back from a deep-linked tab, this screen gets no params of its own, so fall
  // back to the ones in the URL.
  const local = useLocalSearchParams<{ groupId: string }>();
  const global = useGlobalSearchParams<{ groupId: string }>();
  const groupId = local.groupId ?? global.groupId;
  return <CountdownTab groupId={groupId as Id<"groups">} />;
}
