import { computeNextRunAt, ComputeNextRunParams } from "@/lib/scheduling/next-run";

function makeParams(
  overrides: Partial<ComputeNextRunParams>
): ComputeNextRunParams {
  return {
    scheduleType: "interval",
    intervalDays: 1,
    weekDays: [],
    preferredHour: 6,
    timezone: "UTC",
    afterDate: new Date("2025-03-10T12:00:00Z"),
    ...overrides,
  };
}

describe("computeNextRunAt", () => {
  describe("interval schedules", () => {
    it("should add intervalDays and set preferred hour in UTC", () => {
      const result = computeNextRunAt(
        makeParams({
          scheduleType: "interval",
          intervalDays: 3,
          preferredHour: 9,
          timezone: "UTC",
          afterDate: new Date("2025-03-10T12:00:00Z"),
        })
      );

      expect(result.toISOString()).toBe("2025-03-13T09:00:00.000Z");
    });

    it("should add 1 day for daily interval", () => {
      const result = computeNextRunAt(
        makeParams({
          scheduleType: "interval",
          intervalDays: 1,
          preferredHour: 6,
          timezone: "UTC",
          afterDate: new Date("2025-03-10T12:00:00Z"),
        })
      );

      expect(result.toISOString()).toBe("2025-03-11T06:00:00.000Z");
    });

    it("should apply timezone offset for US Eastern", () => {
      const result = computeNextRunAt(
        makeParams({
          scheduleType: "interval",
          intervalDays: 1,
          preferredHour: 9,
          timezone: "America/New_York",
          afterDate: new Date("2025-03-10T12:00:00Z"),
        })
      );

      expect(result.toISOString()).toBe("2025-03-11T13:00:00.000Z");
    });

    it("should handle DST transition for US Eastern (spring forward)", () => {
      const result = computeNextRunAt(
        makeParams({
          scheduleType: "interval",
          intervalDays: 1,
          preferredHour: 9,
          timezone: "America/New_York",
          afterDate: new Date("2025-03-08T14:00:00Z"),
        })
      );

      expect(result.toISOString()).toBe("2025-03-09T13:00:00.000Z");
    });

    it("should handle 30-day interval", () => {
      const result = computeNextRunAt(
        makeParams({
          scheduleType: "interval",
          intervalDays: 30,
          preferredHour: 6,
          timezone: "UTC",
          afterDate: new Date("2025-01-15T10:00:00Z"),
        })
      );

      expect(result.toISOString()).toBe("2025-02-14T06:00:00.000Z");
    });
  });

  describe("weekly schedules", () => {
    it("should find the next matching weekday", () => {
      const result = computeNextRunAt(
        makeParams({
          scheduleType: "weekly",
          weekDays: [3],
          preferredHour: 9,
          timezone: "UTC",
          afterDate: new Date("2025-03-10T12:00:00Z"),
        })
      );

      expect(result.toISOString()).toBe("2025-03-12T09:00:00.000Z");
      expect(result.getUTCDay()).toBe(3);
    });

    it("should pick nearest future day from multiple weekdays", () => {
      const result = computeNextRunAt(
        makeParams({
          scheduleType: "weekly",
          weekDays: [1, 3, 5],
          preferredHour: 9,
          timezone: "UTC",
          afterDate: new Date("2025-03-10T12:00:00Z"),
        })
      );

      expect(result.toISOString()).toBe("2025-03-12T09:00:00.000Z");
      expect(result.getUTCDay()).toBe(3);
    });

    it("should wrap to next week when no days remain", () => {
      const result = computeNextRunAt(
        makeParams({
          scheduleType: "weekly",
          weekDays: [1],
          preferredHour: 9,
          timezone: "UTC",
          afterDate: new Date("2025-03-10T12:00:00Z"),
        })
      );

      expect(result.toISOString()).toBe("2025-03-17T09:00:00.000Z");
      expect(result.getUTCDay()).toBe(1);
    });

    it("should handle same day if preferred hour not yet passed", () => {
      const result = computeNextRunAt(
        makeParams({
          scheduleType: "weekly",
          weekDays: [1],
          preferredHour: 18,
          timezone: "UTC",
          afterDate: new Date("2025-03-10T12:00:00Z"),
        })
      );

      expect(result.toISOString()).toBe("2025-03-10T18:00:00.000Z");
    });

    it("should apply timezone for weekly schedule", () => {
      const result = computeNextRunAt(
        makeParams({
          scheduleType: "weekly",
          weekDays: [3],
          preferredHour: 9,
          timezone: "America/New_York",
          afterDate: new Date("2025-03-10T12:00:00Z"),
        })
      );

      expect(result.toISOString()).toBe("2025-03-12T13:00:00.000Z");
    });

    it("should handle weekend days", () => {
      const result = computeNextRunAt(
        makeParams({
          scheduleType: "weekly",
          weekDays: [0, 6],
          preferredHour: 10,
          timezone: "UTC",
          afterDate: new Date("2025-03-10T12:00:00Z"),
        })
      );

      expect(result.getUTCDay()).toBe(6);
      expect(result.toISOString()).toBe("2025-03-15T10:00:00.000Z");
    });
  });

  describe("backwards compatibility", () => {
    it("should produce same behavior as old calculation for defaults", () => {
      const afterDate = new Date("2025-03-10T12:00:00Z");
      const intervalDays = 7;

      const result = computeNextRunAt(
        makeParams({
          scheduleType: "interval",
          intervalDays,
          preferredHour: 6,
          timezone: "UTC",
          afterDate,
        })
      );

      const oldStyle = new Date(afterDate);
      oldStyle.setDate(oldStyle.getDate() + intervalDays);

      expect(result.getUTCFullYear()).toBe(oldStyle.getUTCFullYear());
      expect(result.getUTCMonth()).toBe(oldStyle.getUTCMonth());
      expect(result.getUTCDate()).toBe(oldStyle.getUTCDate());
      expect(result.getUTCHours()).toBe(6);
    });
  });
});
