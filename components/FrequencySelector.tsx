"use client";

import {
  createDefaultSchedule,
  type CustomReminder,
  type FrequencySchedule,
  type ScheduleCadence,
  type ScheduledYearDate,
  type Weekday,
  WEEKDAYS,
} from "@/lib/schedules";
import { Plus, Trash2 } from "lucide-react";

type Props = {
  value: FrequencySchedule | null;
  onChange: (next: FrequencySchedule | null) => void;
};

const CADENCES: readonly { value: ScheduleCadence; label: string }[] = [
  { value: "daily", label: "Dagelijks" },
  { value: "weekly", label: "Wekelijks" },
  { value: "monthly", label: "Maandelijks" },
  { value: "yearly", label: "Jaarlijks" },
  { value: "custom", label: "Aangepast" },
];

const ordinalLabels = ["Eerste", "Tweede", "Derde", "Vierde", "Vijfde"];

function ordinalLabel(index: number) {
  return ordinalLabels[index] ?? `${index + 1}e`;
}

function resizeArray<T>(items: T[], length: number, makeItem: (index: number) => T) {
  return Array.from({ length }, (_, index) => items[index] ?? makeItem(index));
}

export default function FrequencySelector({ value, onChange }: Props) {
  const updateFrequency = (frequencyText: string) => {
    if (!value || value.cadence === "custom") return;
    const parsed = Number.parseInt(frequencyText, 10);
    const frequency = Number.isFinite(parsed) ? Math.max(1, parsed) : 1;
    if (value.cadence === "daily") {
      onChange({
        ...value,
        frequency,
        times: value.assignTimes
          ? resizeArray(value.times, frequency, () => "")
          : value.times,
      });
    } else {
      onChange({ ...value, frequency });
    }
  };

  const setAssignTimes = (assignTimes: boolean) => {
    if (!value || value.cadence === "custom") return;
    if (value.cadence === "daily") {
      onChange({
        ...value,
        assignTimes,
        times: assignTimes
          ? resizeArray(value.times, value.frequency, () => "")
          : [],
      });
      return;
    }
    if (value.cadence === "weekly") onChange({ ...value, assignTimes, days: [] });
    if (value.cadence === "monthly") onChange({ ...value, assignTimes, days: [] });
    if (value.cadence === "yearly") {
      onChange({
        ...value,
        assignTimes,
        dates: assignTimes
          ? resizeArray(value.dates, value.frequency, () => ({
              month: 1,
              day: 1,
            }))
          : [],
      });
    }
  };

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2">
        <span className="text-lg font-bold text-slate-800">
          Frequentie
        </span>
        <p className="text-sm text-slate-500">
          Als deze taak niet periodiek is, klik dan direct op Nieuwe Registratie
          in Registreren.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-pressed={!value}
          className={[
            "min-h-[56px] rounded-xl border-2 border-b-4 px-3 text-sm font-black transition-all",
            !value
              ? "border-slate-800 bg-slate-800 text-white"
              : "border-slate-200 bg-slate-50 text-slate-700",
          ].join(" ")}
        >
          Niet periodiek
        </button>
        {CADENCES.map((cadence) => (
          <button
            key={cadence.value}
            type="button"
            onClick={() => onChange(createDefaultSchedule(cadence.value))}
            aria-pressed={value?.cadence === cadence.value}
            className={[
              "min-h-[56px] rounded-xl border-2 border-b-4 px-3 text-sm font-black transition-all",
              value?.cadence === cadence.value
                ? "border-blue-700 bg-blue-500 text-white"
                : "border-slate-200 bg-slate-50 text-slate-700",
            ].join(" ")}
          >
            {cadence.label}
          </button>
        ))}
      </div>

      {!value ? null : value.cadence === "custom" ? (
        <CustomReminderFields schedule={value} onChange={onChange} />
      ) : (
        <>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Frequentie
            </span>
            <input
              type="number"
              min={1}
              value={value.frequency}
              onChange={(event) => updateFrequency(event.target.value)}
              className="min-h-[64px] w-full rounded-2xl border-2 border-b-4 border-slate-300 bg-white px-5 text-center text-2xl font-black tabular-nums text-slate-900 outline-none focus:border-blue-500 focus:border-b-blue-700"
            />
          </label>

          <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-3">
            <span className="text-sm font-bold text-slate-700">
              Tijdstippen toewijzen?
            </span>
            <div className="grid grid-cols-2 gap-2">
              <SmallChoice
                selected={!value.assignTimes}
                label="Nee"
                onClick={() => setAssignTimes(false)}
              />
              <SmallChoice
                selected={value.assignTimes}
                label="Ja"
                onClick={() => setAssignTimes(true)}
              />
            </div>
          </div>

          {value.assignTimes ? (
            value.cadence === "daily" ? (
              <DailyFields schedule={value} onChange={onChange} />
            ) : value.cadence === "weekly" ? (
              <WeeklyFields schedule={value} onChange={onChange} />
            ) : value.cadence === "monthly" ? (
              <MonthlyFields schedule={value} onChange={onChange} />
            ) : (
              <YearlyFields schedule={value} onChange={onChange} />
            )
          ) : null}
        </>
      )}
    </section>
  );
}

function SmallChoice({
  selected,
  label,
  onClick,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "min-h-[48px] rounded-xl border-2 border-b-4 text-sm font-black",
        selected
          ? "border-blue-700 bg-blue-500 text-white"
          : "border-slate-200 bg-white text-slate-700",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function DailyFields({
  schedule,
  onChange,
}: {
  schedule: Extract<FrequencySchedule, { cadence: "daily" }>;
  onChange: (next: FrequencySchedule | null) => void;
}) {
  const times = resizeArray(schedule.times, schedule.frequency, () => "");
  return (
    <div className="flex flex-col gap-3">
      {times.map((time, index) => (
        <label key={index} className="flex flex-col gap-2">
          <span className="text-sm font-bold text-slate-600">
            {ordinalLabel(index)} registratietijd
          </span>
          <input
            type="time"
            value={time}
            onChange={(event) => {
              const next = times.slice();
              next[index] = event.target.value;
              onChange({ ...schedule, times: next });
            }}
            className="min-h-[56px] rounded-xl border-2 border-b-4 border-slate-300 px-4 text-lg font-bold outline-none focus:border-blue-500"
          />
        </label>
      ))}
    </div>
  );
}

function WeeklyFields({
  schedule,
  onChange,
}: {
  schedule: Extract<FrequencySchedule, { cadence: "weekly" }>;
  onChange: (next: FrequencySchedule | null) => void;
}) {
  const toggleDay = (weekday: Weekday) => {
    const exists = schedule.days.some((item) => item.weekday === weekday);
    const days = exists
      ? schedule.days.filter((item) => item.weekday !== weekday)
      : [...schedule.days, { weekday }];
    onChange({ ...schedule, days });
  };
  const updateTime = (weekday: Weekday, time: string) => {
    const days = schedule.days.map((item) =>
      item.weekday === weekday ? { ...item, time } : item,
    );
    onChange({ ...schedule, days });
  };
  return (
    <div className="flex flex-col gap-2">
      {WEEKDAYS.map((day) => {
        const selected = schedule.days.find((item) => item.weekday === day.value);
        return (
          <CheckTimeRow
            key={day.value}
            label={day.label}
            checked={!!selected}
            time={selected?.time ?? ""}
            onToggle={() => toggleDay(day.value)}
            onChangeTime={(time) => updateTime(day.value, time)}
          />
        );
      })}
    </div>
  );
}

function MonthlyFields({
  schedule,
  onChange,
}: {
  schedule: Extract<FrequencySchedule, { cadence: "monthly" }>;
  onChange: (next: FrequencySchedule | null) => void;
}) {
  const toggleDay = (day: number) => {
    const exists = schedule.days.some((item) => item.day === day);
    const days = exists
      ? schedule.days.filter((item) => item.day !== day)
      : [...schedule.days, { day }];
    onChange({ ...schedule, days });
  };
  const updateTime = (day: number, time: string) => {
    const days = schedule.days.map((item) =>
      item.day === day ? { ...item, time } : item,
    );
    onChange({ ...schedule, days });
  };
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => {
        const selected = schedule.days.find((item) => item.day === day);
        return (
          <CheckTimeRow
            key={day}
            label={`${day}e dag`}
            checked={!!selected}
            time={selected?.time ?? ""}
            onToggle={() => toggleDay(day)}
            onChangeTime={(time) => updateTime(day, time)}
          />
        );
      })}
    </div>
  );
}

function YearlyFields({
  schedule,
  onChange,
}: {
  schedule: Extract<FrequencySchedule, { cadence: "yearly" }>;
  onChange: (next: FrequencySchedule | null) => void;
}) {
  const dates = resizeArray<ScheduledYearDate>(
    schedule.dates,
    schedule.frequency,
    () => ({ month: 1, day: 1 }),
  );
  return (
    <div className="flex flex-col gap-3">
      {dates.map((date, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold text-slate-600">
              {ordinalLabel(index)} registratiedatum
            </span>
            <input
              type="date"
              value={`2000-${String(date.month).padStart(2, "0")}-${String(
                date.day,
              ).padStart(2, "0")}`}
              onChange={(event) => {
                const [, month, day] = event.target.value.split("-").map(Number);
                const next = dates.slice();
                next[index] = { ...next[index], month, day };
                onChange({ ...schedule, dates: next });
              }}
              className="min-h-[56px] rounded-xl border-2 border-b-4 border-slate-300 px-4 text-lg font-bold outline-none focus:border-blue-500"
            />
          </label>
          <input
            type="time"
            value={date.time ?? ""}
            onChange={(event) => {
              const next = dates.slice();
              next[index] = { ...next[index], time: event.target.value };
              onChange({ ...schedule, dates: next });
            }}
            placeholder="Optioneel"
            className="min-h-[48px] rounded-xl border border-slate-200 px-4 text-base font-semibold placeholder:text-slate-300"
          />
        </div>
      ))}
    </div>
  );
}

function CustomReminderFields({
  schedule,
  onChange,
}: {
  schedule: Extract<FrequencySchedule, { cadence: "custom" }>;
  onChange: (next: FrequencySchedule | null) => void;
}) {
  const addReminder = () => {
    const next: CustomReminder = { id: crypto.randomUUID(), dateTime: "" };
    onChange({ ...schedule, reminders: [...schedule.reminders, next] });
  };
  const updateReminder = (id: string, dateTime: string) => {
    onChange({
      ...schedule,
      reminders: schedule.reminders.map((item) =>
        item.id === id ? { ...item, dateTime } : item,
      ),
    });
  };
  const removeReminder = (id: string) => {
    onChange({
      ...schedule,
      reminders: schedule.reminders.filter((item) => item.id !== id),
    });
  };
  return (
    <div className="flex flex-col gap-3">
      {schedule.reminders.map((reminder) => (
        <div key={reminder.id} className="flex items-center gap-2">
          <input
            type="datetime-local"
            value={reminder.dateTime}
            onChange={(event) => updateReminder(reminder.id, event.target.value)}
            className="min-h-[56px] min-w-0 flex-1 rounded-xl border-2 border-b-4 border-slate-300 px-3 text-base font-bold outline-none focus:border-blue-500"
          />
          <button
            type="button"
            onClick={() => removeReminder(reminder.id)}
            aria-label="Herinnering verwijderen"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-red-500 hover:bg-red-50"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addReminder}
        className="flex min-h-[56px] items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 text-base font-black text-slate-700"
      >
        <Plus className="h-5 w-5" />
        Herinnering toevoegen
      </button>
    </div>
  );
}

function CheckTimeRow({
  label,
  checked,
  time,
  onToggle,
  onChangeTime,
}: {
  label: string;
  checked: boolean;
  time: string;
  onToggle: () => void;
  onChangeTime: (time: string) => void;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <label className="flex min-h-[44px] items-center gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="h-5 w-5 rounded border-slate-300"
        />
        <span className="font-bold text-slate-800">{label}</span>
      </label>
      {checked ? (
        <input
          type="time"
          value={time}
          onChange={(event) => onChangeTime(event.target.value)}
          placeholder="Optioneel"
          className="mt-2 min-h-[48px] w-full rounded-xl border border-slate-200 px-4 text-base font-semibold placeholder:text-slate-300"
        />
      ) : null}
    </div>
  );
}
