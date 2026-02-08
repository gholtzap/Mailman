interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  dayOfWeek: number;
}

function getLocalParts(date: Date, timezone: string): LocalParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    hour12: false,
    weekday: "short",
  });

  const parts = formatter.formatToParts(date);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  let hour = parseInt(get("hour"), 10);
  if (hour === 24) hour = 0;

  return {
    year: parseInt(get("year"), 10),
    month: parseInt(get("month"), 10),
    day: parseInt(get("day"), 10),
    hour,
    dayOfWeek: weekdayMap[get("weekday")] ?? 0,
  };
}

function toUTCFromLocal(
  year: number,
  month: number,
  day: number,
  hour: number,
  timezone: string
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour));

  for (let offset = -26; offset <= 26; offset++) {
    const candidate = new Date(guess.getTime() + offset * 3600_000);
    const parts = getLocalParts(candidate, timezone);
    if (
      parts.year === year &&
      parts.month === month &&
      parts.day === day &&
      parts.hour === hour
    ) {
      return candidate;
    }
  }

  return guess;
}

export interface ComputeNextRunParams {
  scheduleType: "interval" | "weekly";
  intervalDays: number;
  weekDays: number[];
  preferredHour: number;
  timezone: string;
  afterDate: Date;
}

export function computeNextRunAt(params: ComputeNextRunParams): Date {
  const {
    scheduleType,
    intervalDays,
    weekDays,
    preferredHour,
    timezone,
    afterDate,
  } = params;

  if (scheduleType === "interval") {
    const local = getLocalParts(afterDate, timezone);
    const targetDate = new Date(
      Date.UTC(local.year, local.month - 1, local.day)
    );
    targetDate.setUTCDate(targetDate.getUTCDate() + intervalDays);
    const target = getLocalParts(targetDate, "UTC");
    return toUTCFromLocal(
      target.year,
      target.month,
      target.day,
      preferredHour,
      timezone
    );
  }

  const sortedDays = [...weekDays].sort((a, b) => a - b);
  const local = getLocalParts(afterDate, timezone);

  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
    const candidateUTC = new Date(
      Date.UTC(local.year, local.month - 1, local.day)
    );
    candidateUTC.setUTCDate(candidateUTC.getUTCDate() + dayOffset);
    const candidateLocal = getLocalParts(candidateUTC, "UTC");

    const candidateAtHour = toUTCFromLocal(
      candidateLocal.year,
      candidateLocal.month,
      candidateLocal.day,
      preferredHour,
      timezone
    );

    const candidateParts = getLocalParts(candidateAtHour, timezone);

    if (!sortedDays.includes(candidateParts.dayOfWeek)) {
      continue;
    }

    if (candidateAtHour.getTime() > afterDate.getTime()) {
      return candidateAtHour;
    }
  }

  const fallbackUTC = new Date(
    Date.UTC(local.year, local.month - 1, local.day)
  );
  fallbackUTC.setUTCDate(fallbackUTC.getUTCDate() + 7);
  const fallbackLocal = getLocalParts(fallbackUTC, "UTC");
  return toUTCFromLocal(
    fallbackLocal.year,
    fallbackLocal.month,
    fallbackLocal.day,
    preferredHour,
    timezone
  );
}
