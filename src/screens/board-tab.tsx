import { useQuery } from "convex/react";
import type { Id } from "@convex/_generated/dataModel";
import { api } from "@convex/_generated/api";
import { GroupScreen } from "@/components/group-screen";
import { PowersTray } from "@/components/powers-tray";
import { RivalsPanel } from "@/components/rivals-panel";
import { Pill, Section } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { Finale } from "@/screens/finale";

// Owned by the lead. The Board tab: where you stand without knowing your rank.
// Your nearest rivals and your powers all week; the full reveal on Sunday.

export function BoardTab({ groupId }: { groupId: Id<"groups"> }) {
  const token = useToken();
  const view = useQuery(api.rivals.view, token ? { token, groupId } : "skip");
  const status = view?.me.ghostActive ? (
    <Pill label="👻 You're hidden" tone="neutral" />
  ) : view?.me.spyActive ? (
    <Pill label="🔭 Spying" tone="soft" />
  ) : null;

  return (
    <GroupScreen groupId={groupId}>
      {(today) =>
        today.group.phase === "finale" ? (
          <Finale groupId={groupId} />
        ) : (
          <>
            <Section
              title="Your neighbourhood"
              aside={status}
              footnote="Only the people right next to you. Nobody sees the full board until Sunday."
            >
              <RivalsPanel groupId={groupId} />
            </Section>
            <Section title="Powers" footnote="Earned with streaks and the best score of the day. Never bought.">
              <PowersTray groupId={groupId} />
            </Section>
          </>
        )
      }
    </GroupScreen>
  );
}
