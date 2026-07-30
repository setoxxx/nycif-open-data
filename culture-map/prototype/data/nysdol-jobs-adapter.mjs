import { validateEventFeature } from "./event-schema-validator.mjs";

export const NYSDOL_CALENDAR_WEB_NAME = "nys-department-of-labor";
export const NYSDOL_JOBS_FEED_URL = `https://www.trumba.com/calendars/${NYSDOL_CALENDAR_WEB_NAME}.json`;
export const NYSDOL_CALENDAR_URL = "https://www.trumba.com/events-calendar/eastern-time/nys-department-of-labor";
export const NYSDOL_SOURCE_URL = "https://dol.ny.gov/career-calendar";
export const NYC_TIME_ZONE = "America/New_York";

const COUNTY_TO_BOROUGH = new Map([
  ["new york", "Manhattan"], ["new york county", "Manhattan"],
  ["kings", "Brooklyn"], ["kings county", "Brooklyn"],
  ["queens", "Queens"], ["queens county", "Queens"],
  ["bronx", "Bronx"], ["bronx county", "Bronx"],
  ["richmond", "Staten Island"], ["richmond county", "Staten Island"],
]);
const INACTIVE_STATUSES = new Set(["cancelled", "postponed", "expired"]);
const NYC_COORDINATE_BOUNDS = Object.freeze({ south: 40.45, west: -74.3, north: 40.95, east: -73.65 });

function text(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join("; ");
  if (typeof value === "object") return text(value.value ?? value.text ?? value.name ?? "");
  return String(value).trim();
}

function normalized(value) {
  return text(value).toLowerCase().replace(/\s+/g, " ");
}

function firstValue(record, keys) {
  for (const key of keys) {
    const value = key.split(".").reduce((current, part) => current?.[part], record);
    if (value !== undefined && value !== null && (typeof value === "object" || text(value) !== "")) return value;
  }
  return undefined;
}

function customFieldMap(record) {
  const source = firstValue(record, ["customFields", "custom_fields", "fields", "eventFields"]);
  const result = new Map();
  if (Array.isArray(source)) {
    for (const item of source) {
      const name = normalized(item?.fieldName ?? item?.name ?? item?.label ?? item?.key);
      if (!name) continue;
      result.set(name, item?.value ?? item?.text ?? item?.values ?? "");
    }
  } else if (source && typeof source === "object") {
    for (const [name, value] of Object.entries(source)) result.set(normalized(name), value);
  }
  return result;
}

function customValue(fields, names) {
  for (const name of names) {
    const value = fields.get(normalized(name));
    if (value !== undefined && text(value) !== "") return value;
  }
  return undefined;
}

function extractEntries(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ["events", "items", "results", "entries"]) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return null;
}

function finiteNumber(value) {
  if (value === undefined || value === null || text(value) === "") return null;
  const number = typeof value === "number" ? value : Number(text(value));
  return Number.isFinite(number) ? number : null;
}

function validNycCoordinates(latitude, longitude) {
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= NYC_COORDINATE_BOUNDS.south && latitude <= NYC_COORDINATE_BOUNDS.north
    && longitude >= NYC_COORDINATE_BOUNDS.west && longitude <= NYC_COORDINATE_BOUNDS.east;
}

function formatInstantInNyc(date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: NYC_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date).filter(({ type }) => type !== "literal").map(({ type, value }) => [type, value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function parseDateTime(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") return formatInstantInNyc(new Date(value));
  const raw = text(value);
  const dotNet = raw.match(/^\/Date\((\d+)(?:[+-]\d+)?\)\/$/);
  if (dotNet) return formatInstantInNyc(new Date(Number(dotNet[1])));
  const local = raw.match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?)?$/);
  if (local) return { date: local[1], time: local[2] ? `${local[2].padStart(2, "0")}:${local[3]}` : "00:00" };
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : formatInstantInNyc(parsed);
}

function parseSeparateDateTime(record, dateKeys, timeKeys) {
  const dateValue = firstValue(record, dateKeys);
  const timeValue = firstValue(record, timeKeys);
  if (!dateValue) return null;
  const date = parseDateTime(dateValue);
  if (!date) return null;
  if (!timeValue) return date;
  const rawTime = text(timeValue);
  const twelveHour = rawTime.match(/^(\d{1,2}):(\d{2})\s*([ap])\.?m\.?$/i);
  if (twelveHour) {
    let hour = Number(twelveHour[1]);
    if (twelveHour[3].toLowerCase() === "p" && hour !== 12) hour += 12;
    if (twelveHour[3].toLowerCase() === "a" && hour === 12) hour = 0;
    return { date: date.date, time: `${String(hour).padStart(2, "0")}:${twelveHour[2]}` };
  }
  const twentyFourHour = rawTime.match(/^(\d{1,2}):(\d{2})/);
  return twentyFourHour ? { date: date.date, time: `${twentyFourHour[1].padStart(2, "0")}:${twentyFourHour[2]}` } : date;
}

function eventDateTime(record, prefix) {
  return parseDateTime(firstValue(record, [
    `${prefix}DateTime`,
    `${prefix}_date_time`,
    `${prefix}datetime`,
    `${prefix}.dateTime`,
    `${prefix}.date_time`,
    `${prefix}`,
  ])) ?? parseSeparateDateTime(record, [`${prefix}Date`, `${prefix}_date`], [`${prefix}Time`, `${prefix}_time`]);
}

function classifyJobEventType(value, title) {
  const combined = `${normalized(value)} ${normalized(title)}`;
  if (combined.includes("job fair") || combined.includes("career fair")) return "job-fair";
  if (combined.includes("hiring event") || combined.includes("direct hire")) return "hiring-event";
  if (combined.includes("recruit")) return "recruitment";
  if (combined.includes("information session") || combined.includes("info session")) return "information-session";
  if (combined.includes("workshop") || combined.includes("class") || combined.includes("job club")) return "workshop";
  return "workforce-event";
}

function offsetMilliseconds(date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: NYC_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date).filter(({ type }) => type !== "literal").map(({ type, value }) => [type, Number(value)]));
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - date.getTime();
}

function nycInstant(parts) {
  if (!parts) return null;
  const [year, month, day] = parts.date.split("-").map(Number);
  const [hour, minute] = parts.time.split(":").map(Number);
  const initial = Date.UTC(year, month - 1, day, hour, minute, 0);
  let resolved = initial - offsetMilliseconds(new Date(initial));
  resolved = initial - offsetMilliseconds(new Date(resolved));
  const date = new Date(resolved);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeTimestamp(value) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }
  const raw = text(value);
  const dotNet = raw.match(/^\/Date\((\d+)(?:[+-]\d+)?\)\/$/);
  const date = new Date(dotNet ? Number(dotNet[1]) : raw);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function detectStatus(record, title, description, now, end) {
  const explicit = normalized(firstValue(record, ["status", "eventStatus", "event_status"]));
  const combined = `${explicit} ${normalized(title)} ${normalized(description)}`;
  if (/\bcancell?ed\b/.test(combined)) return "cancelled";
  if (/\bpostponed\b/.test(combined)) return "postponed";
  if (/\brescheduled\b|\bnew date\b/.test(combined)) return "rescheduled";
  const endInstant = nycInstant(end);
  if (endInstant && endInstant < now) return "expired";
  if (["tentative", "unverified"].includes(explicit)) return explicit;
  return "confirmed";
}

function inferBorough(county, region, address) {
  const countyMatch = COUNTY_TO_BOROUGH.get(normalized(county));
  if (countyMatch) return countyMatch;
  const addressText = normalized(address);
  if (/\bbronx\b/.test(addressText)) return "Bronx";
  if (/\bbrooklyn\b/.test(addressText)) return "Brooklyn";
  if (/\bqueens\b|\bjamaica\b|\belmhurst\b|\bflushing\b/.test(addressText)) return "Queens";
  if (/\bstaten island\b/.test(addressText)) return "Staten Island";
  if (/\bmanhattan\b|\bnew york,? ny\b/.test(addressText)) return "Manhattan";
  return normalized(region) === "new york city" ? "Unspecified" : null;
}

function isVirtual(record, fields, location) {
  return /virtual|online|zoom|webinar/.test(`${normalized(location)} ${normalized(customValue(fields, ["Region", "Online Access"]))} ${normalized(firstValue(record, ["isVirtual", "virtual"]))}`);
}

function isNycEligible({ borough, region, virtual, audience, includeVirtualCitywide }) {
  if (borough) return true;
  if (normalized(region) === "new york city") return true;
  return Boolean(includeVirtualCitywide && virtual && /all interested jobseekers|new york state|statewide|all jobseekers/.test(normalized(audience)));
}

function extractUrl(...values) {
  for (const value of values) {
    const direct = text(value).match(/https?:\/\/[^\s<>"')\]]+/i)?.[0];
    if (direct) return direct.replace(/[.,;:]+$/, "");
  }
  return "";
}

function stableHash(value) {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function sourceIdentifier(record) {
  return text(firstValue(record, ["eventID", "eventId", "event_id", "id", "uid", "guid"]));
}

function buildEventId(record, title, start, address, organizer) {
  const sourceId = sourceIdentifier(record);
  if (sourceId) return `nysdol-trumba-${sourceId.replace(/[^a-zA-Z0-9_-]+/g, "-")}`;
  return `nysdol-${stableHash([normalized(title), start?.date, start?.time, normalized(address || organizer)].join("|"))}`;
}

function normalizedDedupeKeys(record, title, start, address, venue, organizer) {
  const keys = [];
  const sourceId = sourceIdentifier(record);
  if (sourceId) keys.push(`source:${sourceId}`);
  keys.push(`fallback:${normalized(title)}|${start?.date || ""}T${start?.time || ""}|${normalized(address || venue || organizer)}`);
  return keys;
}

function eventUrl(record, sourceId) {
  const explicit = text(firstValue(record, ["eventUrl", "eventURL", "detailUrl", "detailURL", "webLink", "url", "link"]));
  if (explicit) return explicit;
  return sourceId ? `${NYSDOL_SOURCE_URL}?trumbaEmbed=view%3Devent%26eventid%3D${encodeURIComponent(sourceId)}` : NYSDOL_CALENDAR_URL;
}

function normalizeEvent(record, options) {
  const fields = customFieldMap(record);
  const title = text(firstValue(record, ["title", "summary", "name", "eventTitle"]));
  const description = text(firstValue(record, ["description", "notes", "details"]) ?? customValue(fields, ["Description", "Notes"]));
  const start = eventDateTime(record, "start");
  const end = eventDateTime(record, "end") ?? start;
  if (!title || !start) return { kind: "rejected", reason: "Event requires a title and start date/time." };

  const eventType = customValue(fields, ["Event Type", "Event Types", "Type"]) ?? firstValue(record, ["eventType", "event_type", "category"]);
  const region = text(customValue(fields, ["Region", "Labor Market Region"]) ?? firstValue(record, ["region"]));
  const county = text(customValue(fields, ["County"]) ?? firstValue(record, ["county"]));
  const audience = text(customValue(fields, ["Audience"]) ?? firstValue(record, ["audience"]));
  const venue = text(customValue(fields, ["Career Center Location", "Venue"]) ?? firstValue(record, ["venue", "location.name"]));
  const heldAt = text(customValue(fields, ["Held At", "Address"]) ?? firstValue(record, ["address", "location.address"]));
  const locationValue = firstValue(record, ["location"]);
  const location = typeof locationValue === "string" ? text(locationValue) : "";
  const address = heldAt || location;
  const virtual = isVirtual(record, fields, `${venue} ${address}`);
  let borough = inferBorough(county, region, address);
  if (!borough && virtual && options.includeVirtualCitywide) borough = "Citywide";
  if (!isNycEligible({ borough, region, virtual, audience, includeVirtualCitywide: options.includeVirtualCitywide })) {
    return { kind: "ignored", reason: "Record is outside the NYC Jobs scope." };
  }

  let latitude = finiteNumber(firstValue(record, ["latitude", "lat", "location.latitude", "geo.latitude"]));
  let longitude = finiteNumber(firstValue(record, ["longitude", "lon", "lng", "location.longitude", "geo.longitude"]));
  if (!validNycCoordinates(latitude, longitude) && typeof options.coordinateResolver === "function" && address) {
    const resolved = options.coordinateResolver({ address, venue, borough, record });
    latitude = finiteNumber(resolved?.latitude);
    longitude = finiteNumber(resolved?.longitude);
  }

  const organizer = text(firstValue(record, ["organizer", "organizerName", "owner"])) || "New York State Department of Labor";
  const registrationInformation = customValue(fields, ["Registration Information", "Registration Link", "Online Access"]);
  const registrationUrl = extractUrl(firstValue(record, ["registrationUrl", "registrationURL"]), registrationInformation, description);
  const sourceId = sourceIdentifier(record);
  const sourceUpdatedAt = normalizeTimestamp(firstValue(record, ["lastUpdated", "lastModified", "modifiedDateTime", "updatedAt", "updated_at"]));
  const status = detectStatus(record, title, description, options.now, end);
  const properties = {
    event_id: buildEventId(record, title, start, address, organizer),
    source_event_id: sourceId,
    title,
    description,
    category: "Jobs",
    job_event_type: classifyJobEventType(eventType, title),
    organizer,
    start_date: start.date,
    start_time: start.time,
    end_date: end.date,
    end_time: end.time,
    borough: borough || "Unspecified",
    neighborhood: text(firstValue(record, ["neighborhood"])),
    venue,
    address,
    latitude,
    longitude,
    source_name: "NYS Department of Labor Career Center Events",
    source_url: NYSDOL_SOURCE_URL,
    official_source_url: eventUrl(record, sourceId),
    ...(registrationUrl ? { registration_url: registrationUrl } : {}),
    ...(sourceUpdatedAt ? { source_updated_at: sourceUpdatedAt } : {}),
    ingested_at: options.now.toISOString(),
    last_checked: options.now.toISOString(),
    status,
    public_display_eligible: !INACTIVE_STATUSES.has(status),
    region,
    county,
    virtual,
  };

  const dedupeKeys = normalizedDedupeKeys(record, title, start, address, venue, organizer);
  if (!validNycCoordinates(latitude, longitude)) {
    return {
      kind: "unmapped",
      properties: { ...properties, public_display_eligible: false, mapping_status: "unresolved" },
      dedupeKeys,
    };
  }

  const feature = { type: "Feature", geometry: { type: "Point", coordinates: [longitude, latitude] }, properties };
  const validation = validateEventFeature(feature);
  return validation.valid
    ? { kind: "feature", feature, dedupeKeys }
    : { kind: "rejected", reason: "Normalized record failed schema validation.", errors: validation.errors };
}

export function adaptNysdolJobsFeed(payload, options = {}) {
  const entries = extractEntries(payload);
  if (!entries) throw new TypeError("NYSDOL feed must be an array or an object containing an events/items/results array.");
  const normalizedOptions = {
    now: options.now instanceof Date ? options.now : new Date(options.now ?? Date.now()),
    includeVirtualCitywide: options.includeVirtualCitywide !== false,
    coordinateResolver: options.coordinateResolver,
  };
  const features = [];
  const unmapped = [];
  const rejected = [];
  const ignored = [];
  const duplicates = [];
  const seen = new Set();

  entries.forEach((record, index) => {
    const result = normalizeEvent(record, normalizedOptions);
    const duplicateKey = result.dedupeKeys?.find((key) => seen.has(key));
    if (duplicateKey) {
      duplicates.push({ index, dedupeKey: duplicateKey });
      return;
    }
    result.dedupeKeys?.forEach((key) => seen.add(key));
    if (result.kind === "feature") features.push(result.feature);
    else if (result.kind === "unmapped") unmapped.push({ index, properties: result.properties });
    else if (result.kind === "ignored") ignored.push({ index, reason: result.reason });
    else rejected.push({ index, reason: result.reason, errors: result.errors ?? [] });
  });

  return Object.freeze({
    features,
    unmapped,
    rejected,
    ignored,
    duplicates,
    source: Object.freeze({
      feedUrl: NYSDOL_JOBS_FEED_URL,
      checkedAt: normalizedOptions.now.toISOString(),
      inputCount: entries.length,
    }),
  });
}

function feedDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError("Feed dates must be valid dates.");
  return formatInstantInNyc(date).date.replaceAll("-", "");
}

export function buildNysdolJobsFeedUrl({ startDate = new Date(), days = 180, previousWeeks = 0, html = false } = {}) {
  const url = new URL(NYSDOL_JOBS_FEED_URL);
  url.searchParams.set("startdate", feedDate(startDate));
  url.searchParams.set("days", String(Math.max(0, Math.floor(days))));
  url.searchParams.set("previousweeks", String(Math.max(0, Math.floor(previousWeeks))));
  url.searchParams.set("html", html ? "1" : "0");
  return url.toString();
}

export async function fetchNysdolJobs({ fetchImpl = globalThis.fetch, feedUrl = buildNysdolJobsFeedUrl(), ...options } = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("fetchNysdolJobs requires a fetch implementation.");
  const response = await fetchImpl(feedUrl, { method: "GET" });
  if (!response?.ok) throw new Error(`NYSDOL Jobs feed request failed with status ${response?.status ?? "unknown"}.`);
  return adaptNysdolJobsFeed(await response.json(), options);
}
