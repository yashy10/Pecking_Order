import { Card, Screen, Txt } from "@/components/ui";

// Owned by the lead. Whop Season Pass (PLAN §10, step 4). Cosmetic only: never sells powers.

export function Pass() {
  return (
    <Screen back title="Season Pass">
      <Card>
        <Txt>The Season Pass is coming soon.</Txt>
      </Card>
    </Screen>
  );
}
