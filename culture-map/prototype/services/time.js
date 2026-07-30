export const NYC_TIME_ZONE = "America/New_York";

export const TIME_WINDOW_KINDS = Object.freeze([
  "all",
  "happening-now",
  "starting-soon",
  "today",
  "tonight",
  "tomorrow",
  "this-weekend",
  "next-week",
  "upcoming",
  "past",
]);

const zonedPartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: NYC_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function partsObject(date, timeZone = NYC_TIME_ZONE) {
  const formatter = timeZone === NYC_TIME_ZONE
    ? zonedPartsFormatter
    : new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      });

  return Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, Number(value)]),
  );
}

function offsetMilliseconds(date, timeZone = NYC_TIME_ZONE) {
  const parts = partsObject(date, timeZone);
  const representedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return representedAsUtc - date.getTime();
}

export function zonedDateTime(date, time = "00:00", timeZone = NYC_TIME_ZONE) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) return null;
  if (!/^\d{2}:\d{2}$/.test(String(time || ""))) return null;

  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  if ([year, month, day, hour, minute].some((value) => !Number.isFinite(value))) return null;

  const initial = Date.UTC(year, month - 1, day, hour, minute, 0);
  let resolved = initial - offsetMilliseconds(new Date(initial), timeZone);
  resolved = initial - offsetMilliseconds(new Date(resolved), timeZone);

  const result = new Date(resolved);
  return Number.isNaN(result.getTime()) ? null : result;
}

function dateKey(date, timeZone = NYC_TIME_ZONE) {
  const parts = partsObject(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function shiftDateKey(key, days) {
  const [year, month, day] = key.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

function weekday(date, timeZone = NYC_TIME_ZONE) {
  const key = dateKey(date, timeZone);
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function eventStart(feature) {
  const properties = feature?.properties || {};
  return zonedDateTime(properties.start_date, properties.start_time || "00:00");
}

export function eventEnd(feature) {
  const properties = feature?.properties || {};
  const date = properties.end_date || properties.start_date;
  const time = properties.end_time || properties.start_time || "23:59";
  return zonedDateTime(date, time);
}

export function eventInterval(feature) {
  const start = eventStart(feature);
  const end = eventEnd(feature);
  if (!start || !end || end < start) return null;
  return Object.freeze({ start, end });
}

export function getTimeWindow(kind, now = new Date()) {
  if (!TIME_WINDOW_KINDS.includes(kind)) throw new Error(`Unknown time window: ${kind}`);
  if (kind === "all") return null;

  const today = dateKey(now);
  const tomorrow = shiftDateKey(today, 1);

  if (kind === "happening-now") return Object.freeze({ start: now, end: now });
  if (kind === "starting-soon") {
    return Object.freeze({ start: now, end: new Date(now.getTime() + 2 * 60 * 60 * 1000) });
  }
  if (kind === "today") {
    return Object.freeze({ start: zonedDateTime(today), end: zonedDateTime(tomorrow) });
  }
  if (kind === "tonight") {
    return Object.freeze({ start: zonedDateTime(today, "18:00"), end: zonedDateTime(tomorrow, "04:00") });
  }
  if (kind === "tomorrow") {
    return Object.freeze({ start: zonedDateTime(tomorrow), end: zonedDateTime(shiftDateKey(today, 2)) });
  }
  if (kind === "this-weekend") {
    const day = weekday(now);
    const daysUntilSaturday = day === 0 ? -1 : (6 - day + 7) % 7;
    const saturday = shiftDateKey(today, daysUntilSaturday);
    return Object.freeze({ start: zonedDateTime(saturday), end: zonedDateTime(shiftDateKey(saturday, 2)) });
  }
  if (kind === "next-week") {
    const day = weekday(now);
    const daysUntilMonday = day === 0 ? 1 : 8 - day;
    const monday = shiftDateKey(today, daysUntilMonday);
    return Object.freeze({ start: zonedDateTime(monday), end: zonedDateTime(shiftDateKey(monday, 7)) });
  }
  if (kind === "upcoming") return Object.freeze({ start: now, end: null });
  return Object.freeze({ start: null, end: now });
}

export function matchesTimeWindow(feature, kind, now = new Date()) {
  if (kind === "all") return true;
  const interval = eventInterval(feature);
  if (!interval) return false;

  if (kind === "past") return interval.end < now;
  if (kind === "upcoming") return interval.end >= now;
  if (kind === "starting-soon") {
    const window = getTimeWindow(kind, now);
    return interval.start >= window.start && interval.start < window.end;
  }

  const window = getTimeWindow(kind, now);
  return interval.end >= window.start && interval.start < window.end;
}

export function formatDateTime(feature) {
  const start = eventStart(feature);
  if (!start || Number.isNaN(start.getTime())) return "Time not provided";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: NYC_TIME_ZONE,
  }).format(start);
}
