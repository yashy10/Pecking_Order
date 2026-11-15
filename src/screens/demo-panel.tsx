import { Card, Screen, Txt } from "@/components/ui";

// Owned by the lead. Built in the lead track (PLAN §9): new demo group, bots play,
// Next ▶, Make it Wednesday, rival ghosts, grant power, Jump to Sunday, reset week.

export function DemoPanel() {
  return (
    <Screen back title="Demo panel">
      <Card>
        <Txt>The demo panel arrives in the lead track.</Txt>
      </Card>
    </Screen>
  );
}
