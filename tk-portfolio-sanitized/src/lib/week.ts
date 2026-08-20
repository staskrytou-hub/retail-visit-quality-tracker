const WARSAW_TIME_ZONE = "Europe/Warsaw";

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function datePartsInTimeZone(date: Date, timeZone: string): DateParts {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date).filter(part => part.type !== "literal").map(part => [part.type, Number(part.value)]),
  );
  return values as DateParts;
}

function timeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = datePartsInTimeZone(date, timeZone);
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) -
    Math.floor(date.getTime() / 1000) * 1000;
}

function localMidnightToUtc(year: number, month: number, day: number, timeZone: string) {
  const localMidnightAsUtc = Date.UTC(year, month - 1, day);
  let result = localMidnightAsUtc;
  for (let iteration = 0; iteration < 2; iteration += 1) {
    result = localMidnightAsUtc - timeZoneOffsetMs(new Date(result), timeZone);
  }
  return new Date(result);
}

export function startOfWarsawWeekIso(now = new Date()) {
  const local = datePartsInTimeZone(now, WARSAW_TIME_ZONE);
  const localDate = new Date(Date.UTC(local.year, local.month - 1, local.day));
  const daysSinceMonday = (localDate.getUTCDay() + 6) % 7;
  localDate.setUTCDate(localDate.getUTCDate() - daysSinceMonday);
  return localMidnightToUtc(
    localDate.getUTCFullYear(),
    localDate.getUTCMonth() + 1,
    localDate.getUTCDate(),
    WARSAW_TIME_ZONE,
  ).toISOString();
}
