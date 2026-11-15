import { useQuery } from "convex/react";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button, EmptyState, IconButton, Screen, ScreenSkeleton } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import type { Today } from "@/utils/convex";

// Owned by the lead. The frame every group tab shares: the group's name, the day,
// an Invite button, and one loading and one "not in this group" state for all three.

type Props = {
  groupId: Id<"groups">;
  children: (today: Today) => ReactNode;
};

export function GroupScreen({ groupId, children }: Props) {
  const token = useToken();
  const today = useQuery(api.today.get, token ? { token, groupId } : "skip");

  if (today === undefined) {
    return (
      <Screen tabbed back title=" ">
        <ScreenSkeleton />
      </Screen>
    );
  }

  if (today === null) {
    return (
      <Screen tabbed back>
        <EmptyState
          emoji="🔐"
          title="You're not in this group"
          body="This device hasn't joined it. Ask a friend for the invite link, or open it on the device you joined with."
        >
          <Button label="Go to my groups" onPress={() => router.replace("/")} />
        </EmptyState>
      </Screen>
    );
  }

  const { group } = today;
  return (
    <Screen
      tabbed
      back
      title={group.name}
      subtitle={`${group.dayLabel} · Week ${group.week}`}
      right={
        <IconButton
          icon="qr"
          label="Invite friends"
          testID="invite-button"
          onPress={() => router.push(`/g/${groupId}/invite`)}
        />
      }
    >
      {children(today)}
    </Screen>
  );
}
