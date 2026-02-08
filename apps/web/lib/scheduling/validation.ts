export function validateScheduleFields(body: {
  scheduleType?: string;
  intervalDays?: number;
  weekDays?: number[];
  preferredHour?: number;
  timezone?: string;
}): string | null {
  const scheduleType = body.scheduleType ?? "interval";

  if (scheduleType !== "interval" && scheduleType !== "weekly") {
    return "scheduleType must be 'interval' or 'weekly'";
  }

  if (scheduleType === "interval") {
    if (
      body.intervalDays === undefined ||
      !Number.isInteger(body.intervalDays) ||
      body.intervalDays < 1 ||
      body.intervalDays > 90
    ) {
      return "intervalDays must be an integer between 1 and 90";
    }
  }

  if (scheduleType === "weekly") {
    if (!Array.isArray(body.weekDays) || body.weekDays.length === 0) {
      return "weekDays must be a non-empty array when scheduleType is 'weekly'";
    }
    const seen = new Set<number>();
    for (const day of body.weekDays) {
      if (!Number.isInteger(day) || day < 0 || day > 6) {
        return "Each weekDay must be an integer between 0 (Sunday) and 6 (Saturday)";
      }
      if (seen.has(day)) {
        return "weekDays must not contain duplicates";
      }
      seen.add(day);
    }
  }

  if (body.preferredHour !== undefined) {
    if (
      !Number.isInteger(body.preferredHour) ||
      body.preferredHour < 0 ||
      body.preferredHour > 23
    ) {
      return "preferredHour must be an integer between 0 and 23";
    }
  }

  if (body.timezone !== undefined) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: body.timezone });
    } catch {
      return "Invalid timezone";
    }
  }

  return null;
}
