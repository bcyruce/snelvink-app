export type ScheduleCadence =
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "custom";

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type ScheduledWeekday = {
  weekday: Weekday;
  time?: string;
};

export type ScheduledMonthDay = {
  day: number;
  time?: string;
};

export type ScheduledYearDate = {
  month: number;
  day: number;
  time?: string;
};

export type CustomReminder = {
  id: string;
  dateTime: string;
};

export type ScheduleOccurrence = {
  date: string;
  time?: string;
  requiredCount: number;
  source: "scheduled" | "quota";
};

export type FrequencySchedule =
  | {
      cadence: "daily";
      frequency: number;
      assignTimes: boolean;
      times: string[];
    }
  | {
      cadence: "weekly";
      frequency: number;
      assignTimes: boolean;
      days: ScheduledWeekday[];
    }
  | {
      cadence: "monthly";
      frequency: number;
      assignTimes: boolean;
      days: ScheduledMonthDay[];
    }
  | {
      cadence: "yearly";
      frequency: number;
      assignTimes: boolean;
      dates: ScheduledYearDate[];
    }
  | {
      cadence: "custom";
      reminders: CustomReminder[];
    };

export const WEEKDAYS: readonly { value: Weekday; label: string }[] = [
  { value: 1, label: "Maandag" },
  { value: 2, label: "Dinsdag" },
  { value: 3, label: "Woensdag" },
  { value: 4, label: "Donderdag" },
  { value: 5, label: "Vrijdag" },
  { value: 6, label: "Zaterdag" },
  { value: 7, label: "Zondag" },
];

export function createDefaultSchedule(
  cadence: ScheduleCadence,
): FrequencySchedule {
  if (cadence === "custom") {
    return { cadence, reminders: [] };
  }
  if (cadence === "daily") {
    return { cadence, frequency: 1, assignTimes: false, times: [] };
  }
  if (cadence === "weekly") {
    return { cadence, frequency: 1, assignTimes: false, days: [] };
  }
  if (cadence === "monthly") {
    return { cadence, frequency: 1, assignTimes: false, days: [] };
  }
  return { cadence, frequency: 1, assignTimes: false, dates: [] };
}

export function normalizeSchedule(value: unknown): FrequencySchedule | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const cadence = raw.cadence;
  if (
    cadence !== "daily" &&
    cadence !== "weekly" &&
    cadence !== "monthly" &&
    cadence !== "yearly" &&
    cadence !== "custom"
  ) {
    return null;
  }

  if (cadence === "custom") {
    const reminders = Array.isArray(raw.reminders)
      ? raw.reminders
          .map((item) => {
            const reminder = item as Record<string, unknown>;
            const dateTime =
              typeof reminder.dateTime === "string" ? reminder.dateTime : "";
            return {
              id:
                typeof reminder.id === "string" && reminder.id.trim()
                  ? reminder.id
                  : crypto.randomUUID(),
              dateTime,
            };
          })
          .filter((item) => item.dateTime.trim())
      : [];
    return { cadence, reminders };
  }

  const frequency =
    typeof raw.frequency === "number" && Number.isFinite(raw.frequency)
      ? Math.max(1, Math.floor(raw.frequency))
      : 1;
  const assignTimes = raw.assignTimes === true;

  if (cadence === "daily") {
    const times = Array.isArray(raw.times)
      ? raw.times.filter((item): item is string => typeof item === "string")
      : [];
    return { cadence, frequency, assignTimes, times };
  }

  if (cadence === "weekly") {
    const days = Array.isArray(raw.days)
      ? raw.days
          .map((item) => {
            const day = item as Record<string, unknown>;
            return {
              weekday: day.weekday as Weekday,
              time: typeof day.time === "string" ? day.time : undefined,
            };
          })
          .filter((item) => item.weekday >= 1 && item.weekday <= 7)
      : [];
    return { cadence, frequency, assignTimes, days };
  }

  if (cadence === "monthly") {
    const days = Array.isArray(raw.days)
      ? raw.days
          .map((item) => {
            const day = item as Record<string, unknown>;
            return {
              day: typeof day.day === "number" ? Math.floor(day.day) : 0,
              time: typeof day.time === "string" ? day.time : undefined,
            };
          })
          .filter((item) => item.day >= 1 && item.day <= 31)
      : [];
    return { cadence, frequency, assignTimes, days };
  }

  const dates = Array.isArray(raw.dates)
    ? raw.dates
        .map((item) => {
          const date = item as Record<string, unknown>;
          return {
            month: typeof date.month === "number" ? Math.floor(date.month) : 0,
            day: typeof date.day === "number" ? Math.floor(date.day) : 0,
            time: typeof date.time === "string" ? date.time : undefined,
          };
        })
        .filter((item) => item.month >= 1 && item.month <= 12 && item.day >= 1)
    : [];
  return { cadence, frequency, assignTimes, dates };
}

type ScheduleTranslate = (
  key:
    | "scheduleAtLeastOneReminder"
    | "scheduleReminderDateTime"
    | "scheduleMinFrequency"
    | "scheduleDailyTimes"
    | "scheduleWeeklyDays"
    | "scheduleMonthlyDays"
    | "scheduleYearlyDates",
  vars?: Record<string, string | number>,
) => string;

export function validateSchedule(
  schedule: FrequencySchedule | null,
  t?: ScheduleTranslate,
): string | null {
  if (!schedule) return null;
  if (schedule.cadence === "custom") {
    if (schedule.reminders.length === 0) {
      return t ? t("scheduleAtLeastOneReminder") : "Voeg minimaal één herinnering toe.";
    }
    return schedule.reminders.every((item) => item.dateTime.trim())
      ? null
      : t
        ? t("scheduleReminderDateTime")
        : "Vul voor elke herinnering een datum en tijd in.";
  }

  if (!Number.isFinite(schedule.frequency) || schedule.frequency < 1) {
    return t ? t("scheduleMinFrequency") : "Kies een frequentie van minimaal 1.";
  }

  if (!schedule.assignTimes) return null;

  if (schedule.cadence === "daily" && schedule.times.length !== schedule.frequency) {
    return t ? t("scheduleDailyTimes") : "Vul voor elke dagelijkse registratie een tijd in.";
  }
  if (schedule.cadence === "weekly" && schedule.days.length !== schedule.frequency) {
    return t
      ? t("scheduleWeeklyDays", { count: schedule.frequency })
      : `Kies ${schedule.frequency} dag(en) voor deze wekelijkse taak.`;
  }
  if (schedule.cadence === "monthly" && schedule.days.length !== schedule.frequency) {
    return t
      ? t("scheduleMonthlyDays", { count: schedule.frequency })
      : `Kies ${schedule.frequency} dag(en) voor deze maandelijkse taak.`;
  }
  if (schedule.cadence === "yearly" && schedule.dates.length !== schedule.frequency) {
    return t
      ? t("scheduleYearlyDates", { count: schedule.frequency })
      : `Kies ${schedule.frequency} datum(s) voor deze jaarlijkse taak.`;
  }

  return null;
}

export function requiredCountForSchedule(schedule: FrequencySchedule): number {
  if (schedule.cadence === "custom") return schedule.reminders.length;
  return schedule.frequency;
}

export function getPeriodRange(
  cadence: Exclude<ScheduleCadence, "custom">,
  now = new Date(),
): { start: Date; end: Date; label: string } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (cadence === "daily") {
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end, label: "vandaag" };
  }

  if (cadence === "weekly") {
    const mondayOffset = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - mondayOffset);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end, label: "deze week" };
  }

  if (cadence === "monthly") {
    start.setDate(1);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    return { start, end, label: "deze maand" };
  }

  start.setMonth(0, 1);
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  return { start, end, label: "dit jaar" };
}

export function scheduleToJson(schedule: FrequencySchedule | null): unknown {
  return schedule;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function weekdayForDate(date: Date): Weekday {
  const day = date.getDay();
  return (day === 0 ? 7 : day) as Weekday;
}

function inRange(date: Date, start: Date, end: Date): boolean {
  return date >= start && date < end;
}

function dateFromParts(year: number, month: number, day: number): Date | null {
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function generateScheduleOccurrences(
  schedule: FrequencySchedule,
  start: Date,
  end: Date,
  isOpenDate: (date: Date) => boolean = () => true,
): ScheduleOccurrence[] {
  const startDay = startOfDay(start);
  const endDay = startOfDay(end);
  const occurrences: ScheduleOccurrence[] = [];

  if (schedule.cadence === "custom") {
    for (const reminder of schedule.reminders) {
      const date = new Date(reminder.dateTime);
      if (Number.isNaN(date.getTime()) || !inRange(date, startDay, endDay)) {
        continue;
      }
      occurrences.push({
        date: toIsoDate(date),
        time: reminder.dateTime.slice(11, 16) || undefined,
        requiredCount: 1,
        source: "scheduled",
      });
    }
    return occurrences;
  }

  if (schedule.cadence === "daily") {
    const times = schedule.assignTimes ? schedule.times : [];
    for (let cursor = startDay; cursor < endDay; cursor = addDays(cursor, 1)) {
      if (!isOpenDate(cursor)) continue;
      occurrences.push({
        date: toIsoDate(cursor),
        time: times[0] || undefined,
        requiredCount: schedule.frequency,
        source: "scheduled",
      });
    }
    return occurrences;
  }

  if (schedule.cadence === "weekly") {
    if (schedule.assignTimes && schedule.days.length > 0) {
      for (let cursor = startDay; cursor < endDay; cursor = addDays(cursor, 1)) {
        const day = schedule.days.find(
          (item) => item.weekday === weekdayForDate(cursor),
        );
        if (!day) continue;
        occurrences.push({
          date: toIsoDate(cursor),
          time: day.time || undefined,
          requiredCount: 1,
          source: "scheduled",
        });
      }
      return occurrences;
    }

    for (let cursor = startDay; cursor < endDay; cursor = addDays(cursor, 1)) {
      if (cursor.getTime() !== startDay.getTime() && weekdayForDate(cursor) !== 1) {
        continue;
      }
      occurrences.push({
        date: toIsoDate(cursor),
        requiredCount: schedule.frequency,
        source: "quota",
      });
    }
    return occurrences;
  }

  if (schedule.cadence === "monthly") {
    if (schedule.assignTimes && schedule.days.length > 0) {
      for (let cursor = startDay; cursor < endDay; cursor = addDays(cursor, 1)) {
        const day = schedule.days.find((item) => item.day === cursor.getDate());
        if (!day) continue;
        occurrences.push({
          date: toIsoDate(cursor),
          time: day.time || undefined,
          requiredCount: 1,
          source: "scheduled",
        });
      }
      return occurrences;
    }

    occurrences.push({
      date: toIsoDate(startDay),
      requiredCount: schedule.frequency,
      source: "quota",
    });
    for (
      let cursor = new Date(startDay.getFullYear(), startDay.getMonth() + 1, 1);
      cursor < endDay;
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    ) {
      occurrences.push({
        date: toIsoDate(cursor),
        requiredCount: schedule.frequency,
        source: "quota",
      });
    }
    return occurrences;
  }

  const years = new Set<number>();
  for (let cursor = startDay; cursor < endDay; cursor = addDays(cursor, 366)) {
    years.add(cursor.getFullYear());
    years.add(cursor.getFullYear() + 1);
  }

  if (schedule.assignTimes && schedule.dates.length > 0) {
    for (const year of years) {
      for (const item of schedule.dates) {
        const date = dateFromParts(year, item.month, item.day);
        if (!date || !inRange(date, startDay, endDay)) continue;
        occurrences.push({
          date: toIsoDate(date),
          time: item.time || undefined,
          requiredCount: 1,
          source: "scheduled",
        });
      }
    }
    return occurrences;
  }

  occurrences.push({
    date: toIsoDate(startDay),
    requiredCount: schedule.frequency,
    source: "quota",
  });
  for (const year of years) {
    const date = new Date(year + 1, 0, 1);
    if (!inRange(date, startDay, endDay)) continue;
    occurrences.push({
      date: toIsoDate(date),
      requiredCount: schedule.frequency,
      source: "quota",
    });
  }
  return occurrences;
}
