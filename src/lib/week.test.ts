import { describe, expect, it } from "vitest";
import { startOfWarsawWeekIso } from "./week";

describe("startOfWarsawWeekIso", () => {
  it("starts the summer Warsaw week on Monday at local midnight", () => {
    expect(startOfWarsawWeekIso(new Date("2026-07-29T12:00:00.000Z"))).toBe("2026-07-26T22:00:00.000Z");
  });

  it("does not include Sunday from the previous calendar week", () => {
    const weekStart = startOfWarsawWeekIso(new Date("2026-07-27T08:00:00.000Z"));
    expect(new Date("2026-07-26T20:00:00.000Z").getTime()).toBeLessThan(new Date(weekStart).getTime());
    expect(weekStart).toBe("2026-07-26T22:00:00.000Z");
  });
});
