import { useLocalSearchParams } from "expo-router";
import type { Id } from "@convex/_generated/dataModel";
import { BoardTab } from "@/screens/board-tab";

export default function BoardTabRoute() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  return <BoardTab groupId={groupId as Id<"groups">} />;
}
