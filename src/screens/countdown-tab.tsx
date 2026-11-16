import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import type { Id } from "@convex/_generated/dataModel";
import { GroupScreen } from "@/components/group-screen";
import { Button, Card, Icon, Mark, Section, Txt } from "@/components/ui";
import { useNow } from "@/hooks/use-now";
import { colors, fonts, places, radius, space } from "@/theme";
import type { Today } from "@/utils/convex";
import { clockTime, eveningName, shortDuration, splitDuration, weekdayName } from "@/utils/time";

// Owned by the lead. The Sunday tab: the countdown to the finale, when the full pecking
// order drops. Automatic groups count down to the real Sunday 9 PM, to the second. Demo
// groups, which the presenter moves, count the days left instead.

const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CountdownTab({ groupId }: { groupId: Id<"groups"> }) {
  return <GroupScreen groupId={groupId} place="sunday">{(today) => <Countdown groupId={groupId} today={today} />}</GroupScreen>;
}

function Countdown({ groupId, today }: { groupId: Id<"groups">; today: Today }) {
  const { group } = today;
  const finale = group.phase === "finale";
  const live = group.finaleAt !== null && !finale;
  const now = useNow(live || group.nextTickAt !== null);

  return (
    <>
      {finale ? (
        <ResultsAreIn groupId={groupId} week={group.week} nextWeekAt={group.nextTickAt} />
      ) : live && group.finaleAt !== null ? (
        <Clock target={group.finaleAt} now={now} />
      ) : (
        <DaysLeft day={group.day} />
      )}

      <Section title={`Week ${group.week}`}>
        <WeekStrip day={group.day} phase={group.phase} />
      </Section>

      {!finale && group.nextTickAt !== null && group.nextTickAt !== group.finaleAt ? (
        <NextUp at={group.nextTickAt} now={now} revealing={group.phase === "open"} />
      ) : null}

      {finale ? null : (
        <Txt variant="caption" color={colors.muted} align="center">
          Until the finale, nobody sees the whole board, only the rivals right next to them.
        </Txt>
      )}
    </>
  );
}

/** Days, hours, minutes and seconds to the finale. */
function Clock({ target, now }: { target: number; now: number }) {
  const left = target - now;
  const p = splitDuration(left);
  const units: [number, string][] = [
    [p.days, "Days"],
    [p.hours, "Hrs"],
    [p.minutes, "Min"],
    [p.seconds, "Sec"],
  ];
  return (
    <Card tone="soft" testID="countdown" style={styles.hero}>
      <Txt variant="overline" color={colors.muted}>
        {left > 0 ? "The full board drops in" : "The full board drops"}
      </Txt>
      {left > 0 ? (
        <View
          style={styles.tiles}
          accessible
          accessibilityRole="timer"
          accessibilityLabel={`${p.days} days, ${p.hours} hours and ${p.minutes} minutes to go`}
        >
          {units.map(([value, label]) => (
            <View key={label} style={styles.tile}>
              <Text style={styles.digits}>{String(value).padStart(2, "0")}</Text>
              <Txt variant="overline" color={colors.muted}>
                {label}
              </Txt>
            </View>
          ))}
        </View>
      ) : (
        <Txt variant="display" align="center">
          Any moment now
        </Txt>
      )}
      <Txt color={colors.muted} align="center">
        {weekdayName(target)} at {clockTime(target)}: the full board, and a champion.
      </Txt>
    </Card>
  );
}

/** Demo groups have no real calendar: count the game days left until Sunday. */
function DaysLeft({ day }: { day: number }) {
  const left = Math.max(0, 6 - day);
  return (
    <Card tone="soft" testID="countdown" style={styles.hero}>
      <Txt variant="overline" color={colors.muted}>
        The full board drops
      </Txt>
      <Text style={styles.big}>{left === 0 ? "Tonight" : left}</Text>
      {left > 0 ? (
        <Txt variant="title" align="center">
          {left === 1 ? "day to go" : "days to go"}
        </Txt>
      ) : null}
      <Txt color={colors.muted} align="center">
        Sunday night: the full board, and a champion.
      </Txt>
    </Card>
  );
}

function ResultsAreIn({ groupId, week, nextWeekAt }: { groupId: Id<"groups">; week: number; nextWeekAt: number | null }) {
  return (
    <Card tone="soft" testID="countdown-finale" style={styles.hero}>
      <Mark icon="crown" tone="plain" />
      <Txt variant="overline" color={colors.muted}>
        Week {week} is over
      </Txt>
      <Txt variant="display" align="center">
        The results are in
      </Txt>
      <Txt color={colors.muted} align="center">
        {nextWeekAt !== null
          ? `The full board is out. A new week starts at midnight, and the countdown starts again.`
          : "The full board is out. See who rules the roost, and where you landed."}
      </Txt>
      <View style={styles.stretch}>
        <Button label="See the final board" onPress={() => router.navigate(`/g/${groupId}/board`)} />
      </View>
    </Card>
  );
}

/** Seven squares: days done, today, and Sunday's crown. */
function WeekStrip({ day, phase }: { day: number; phase: Today["group"]["phase"] }) {
  return (
    <View style={styles.week} accessible accessibilityLabel={`${DAY_SHORT[day]} of the week`}>
      {DAY_SHORT.map((label, d) => {
        const sunday = d === 6;
        const done = d < day || (d === day && phase !== "open");
        const current = d === day;
        return (
          <View key={label} style={[styles.cell, done && styles.cellDone, current && styles.cellNow]}>
            <Txt variant="overline" color={current ? colors.accent : colors.muted} style={styles.cellLabel}>
              {label}
            </Txt>
            {sunday ? (
              <Text style={styles.cellCrown}>👑</Text>
            ) : done ? (
              <Icon name="check" size={16} color={colors.ink} strokeWidth={2.4} />
            ) : (
              <View style={[styles.dot, current && styles.dotNow]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

/** The next daily step: tonight's reveal, or the next game at midnight. */
function NextUp({ at, now, revealing }: { at: number; now: number; revealing: boolean }) {
  const when = revealing ? `${capitalise(eveningName(at, now))} at ${clockTime(at)}` : "Midnight";
  return (
    <Card style={styles.next}>
      <View style={styles.nextIcon}>
        <Icon name={revealing ? "lock" : "today"} size={20} color={colors.accent} />
      </View>
      <View style={styles.grow}>
        <Txt variant="overline" color={colors.muted}>
          {revealing ? "Next reveal" : "Next game"}
        </Txt>
        <Txt variant="heading">
          {when} · in {shortDuration(at - now)}
        </Txt>
      </View>
    </Card>
  );
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: space(3), paddingVertical: space(6) },
  tiles: { flexDirection: "row", gap: space(2), alignSelf: "stretch", justifyContent: "center" },
  tile: {
    flex: 1,
    maxWidth: 84,
    alignItems: "center",
    gap: space(1),
    paddingVertical: space(3),
    borderRadius: radius.tile,
    backgroundColor: colors.surface,
  },
  digits: {
    fontFamily: fonts.display,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  big: { fontFamily: fonts.display, fontSize: 64, lineHeight: 68, letterSpacing: -2, color: colors.ink },
  stretch: { alignSelf: "stretch" },
  week: { flexDirection: "row", gap: space(1.5) },
  cell: {
    flex: 1,
    alignItems: "center",
    gap: space(2),
    paddingVertical: space(3),
    borderRadius: radius.field,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cellDone: { backgroundColor: places.sunday.soft, borderColor: places.sunday.soft },
  cellNow: { borderColor: colors.accent, borderWidth: 1.5 },
  cellLabel: { letterSpacing: 1 },
  cellCrown: { fontSize: 16, lineHeight: 18 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.fog },
  dotNow: { backgroundColor: colors.accent },
  next: { flexDirection: "row", alignItems: "center", gap: space(3) },
  nextIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: places.sunday.soft,
  },
  grow: { flex: 1 },
});
