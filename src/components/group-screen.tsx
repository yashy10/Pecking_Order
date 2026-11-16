import { useQuery } from "convex/react";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button, EmptyState, IconButton, Screen, ScreenSkeleton } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import type { Place } from "@/theme";
import type { Today } from "@/utils/convex";

// Owned by the lead. The frame every group tab shares: the group's name, the day,
// an Invite button, and one loading and one "not in this group" state for all three.

type Props = {
  groupId: Id<"groups">;
  /** The tab's colour world. */
  place?: Place;
  children: (today: Today) => ReactNode;
};

export function GroupScreen({ groupId, place = "today", children }: Props) {
  const token = useToken();
  // groupId is briefly undefined while the router leaves the group (Back from a deep link).
  const today = useQuery(api.today.get, token && groupId ? { token, groupId } : "skip");

  if (today === undefined) {
    return (
      <Screen tabbed back place={place} title=" ">
        <ScreenSkeleton />
      </Screen>
    );
  }

  if (today === null) {
    return (
      <Screen tabbed back place={place}>
        <EmptyState
          emoji="🔐"
          title="You're not in this group yet"
          body="Ask a friend for their invite link, or open the game on the phone you joined with."
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
      place={place}
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
