import { validateEventFeature } from "./event-schema-validator.mjs";

const BOROUGH_ALIASES = new Map([
  ["manhattan", "Manhattan"],
  ["new york", "Manhattan"],
  ["new york county", "Manhattan"],
  ["brooklyn", "Brooklyn"],
  ["kings", "Brooklyn"],
  ["kings county", "Brooklyn"],
  ["queens", "Queens"],
  ["queens county", "Queens"],
  ["bronx", "Bronx"],
  ["the bronx", "Bronx"],
  ["bronx county", "Bronx"],
  ["staten island", "Staten Island"],
  ["richmond", "Staten Island"],
  ["richmond county", "Staten Island"],
  ["citywide", "Citywide"],
  ["unspecified", "Unspecified"],
]);

const CATEGORY_ALIASES = new Map([
  ["arts", "Arts & Culture"],
  ["arts and culture", "Arts & Culture"],
  ["arts & culture", "Arts & Culture"],
  ["civic", "Civic / Public Meeting"],
  ["public meeting", "Civic / Public Meeting"],
  ["civic / public meeting", "Civic / Public Meeting"],
  ["festival", "Festival / Street Fair"],
  ["street fair", "Festival / Street Fair"],
  ["festival / street fair", "Festival / Street Fair"],
  ["parade", "Parade / March / Procession"],
  ["march", "Parade / March / Procession"],
  ["procession", "Parade / March / Procession"],
  ["parade / march / procession", "Parade / March / Procession"],
  ["parks", "Parks / Outdoors"],
  ["outdoors", "Parks / Outdoors"],
  ["parks / outdoors", "Parks / Outdoors"],
  ["photo op", "Photo Opportunity"],
  ["photo opportunity", "Photo Opportunity"],
  ["sports", "Sports Culture"],
  ["sports culture", "Sports Culture"],
  ["transit", "Transit / Street Closure"],
  ["street closure", "Transit / Street Closure"],
  ["transit / street closure", "Transit / Street Closure"],
  ["family", "Family"],
  ["job", "Jobs"],
  ["jobs", "Jobs"],
  ["job fair", "Jobs"],
  ["hiring event", "Jobs"],
  ["recruitment", "Jobs"],
  ["career workshop", "Jobs"],
  ["other", "Other"],
]);

const JOB_TYPE_ALIASES = new Map([
  ["job fair", "job-fair"],
  ["career fair", "job-fair"],
  ["mini job fair", "job-fair"],
  ["hiring event", "hiring-event"],
  ["recruitment", "recruitment"],
  ["workshop", "workshop"],
  ["virtual workshop", "workshop"],
  ["information session", "information-session"],
  ["workforce event", "workforce-event"],
]);

const STATUS_ALIASES = new Map([
  ["confirmed", "confirmed"],
  ["active", "confirmed"],
  ["tentative", "tentative"],
  ["unverified", "unverified"],
  ["cancelled", "cancelled"],
  ["canceled", "cancelled"],
  ["postponed", "postponed"],
  ["rescheduled", "rescheduled"],
  ["expired", "expired"],
]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : value;
}

function normalizeAlias(value, aliases) {
  if (typeof value !== "string") return value;
  const cleaned = value.trim();
  return aliases.get(cleaned.toLowerCase()) ?? cleaned;
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1") return true;
  if (value === 0 || value === "0") return false;
  if (typeof value !== "string") return value;

  const normalized = value.trim().toLowerCase();
  if (["true", "yes", "y"].includes(normalized)) return true;
  if (["false", "no", "n"].includes(normalized)) return false;
  return value;
}

function normalizeNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string" || !value.trim()) return value;
  const normalized = Number(value.trim());
  return Number.isFinite(normalized) ? normalized : value;
}

function normalizeDate(value) {
  if (typeof value !== "string") return value;
  const cleaned = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;

  const timestamp = Date.parse(cleaned);
  return Number.isNaN(timestamp) ? cleaned : new Date(timestamp).toISOString().slice(0, 10);
}

function normalizeTime(value) {
  if (typeof value !== "string") return value;
  const cleaned = value.trim();
  const twentyFourHour = cleaned.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  if (twentyFourHour) return `${twentyFourHour[1].padStart(2, "0")}:${twentyFourHour[2]}`;

  const twelveHour = cleaned.match(/^(\d{1,2}):([0-5]\d)\s*([ap])\.?m\.?$/i);
  if (!twelveHour) return cleaned;

  let hour = Number(twelveHour[1]);
  if (hour < 1 || hour > 12) return cleaned;
  if (twelveHour[3].toLowerCase() === "p" && hour !== 12) hour += 12;
  if (twelveHour[3].toLowerCase() === "a" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${twelveHour[2]}`;
}

function normalizeRecord(rawRecord, geometry) {
  const source = isRecord(rawRecord) ? rawRecord : {};
  const coordinates = Array.isArray(geometry?.coordinates) ? geometry.coordinates : [];
  const normalized = {};

  for (const [key, value] of Object.entries(source)) {
    normalized[key] = cleanText(value);
  }

  normalized.event_id = cleanText(source.event_id ?? source.id);
  normalized.title = cleanText(source.title ?? source.name);
  normalized.category = normalizeAlias(source.category, CATEGORY_ALIASES);
  normalized.borough = normalizeAlias(source.borough, BOROUGH_ALIASES);
  normalized.status = normalizeAlias(source.status, STATUS_ALIASES);
  normalized.start_date = normalizeDate(source.start_date ?? source.date);
  if ("end_date" in source) normalized.end_date = normalizeDate(source.end_date);
  if ("start_time" in source) normalized.start_time = normalizeTime(source.start_time);
  if ("end_time" in source) normalized.end_time = normalizeTime(source.end_time);
  normalized.longitude = normalizeNumber(source.longitude ?? coordinates[0]);
  normalized.latitude = normalizeNumber(source.latitude ?? coordinates[1]);
  normalized.public_display_eligible = normalizeBoolean(source.public_display_eligible);

  const rawJobType = source.job_event_type ?? source.event_type;
  if (rawJobType !== undefined) {
    normalized.job_event_type = normalizeAlias(rawJobType, JOB_TYPE_ALIASES);
  }

  for (const field of [
    "source_url",
    "official_source_url",
    "registration_url",
    "nycif_url",
    "source_name",
    "source_updated_at",
    "ingested_at",
    "last_checked",
    "organizer",
    "venue",
    "address",
  ]) {
    if (field in source) normalized[field] = cleanText(source[field]);
  }

  return normalized;
}

function extractEntries(input) {
  if (Array.isArray(input)) return input;
  if (isRecord(input) && input.type === "FeatureCollection" && Array.isArray(input.features)) {
    return input.features;
  }
  if (isRecord(input) && Array.isArray(input.events)) return input.events;
  return null;
}

function toFeature(entry) {
  const isFeature = isRecord(entry) && entry.type === "Feature";
  const geometry = isFeature ? entry.geometry : null;
  const properties = normalizeRecord(isFeature ? entry.properties : entry, geometry);

  return {
    type: "Feature",
    ...(isFeature && entry.id !== undefined ? { id: entry.id } : {}),
    geometry: {
      type: "Point",
      coordinates: [properties.longitude, properties.latitude],
    },
    properties,
  };
}

export class EventImportError extends Error {
  constructor(rejected) {
    const details = rejected
      .flatMap(({ index, errors }) => errors.map(({ path, message }) => `record ${index} ${path}: ${message}`))
      .join("; ");
    super(`Event import rejected ${rejected.length} record(s): ${details}`);
    this.name = "EventImportError";
    this.rejected = rejected;
  }
}

export function importEventData(input) {
  const entries = extractEntries(input);
  if (!entries) {
    return {
      features: [],
      rejected: [{ index: -1, errors: [{ path: "$", message: "Input must be a FeatureCollection, an array, or an object with an events array." }] }],
    };
  }

  const features = [];
  const rejected = [];
  const eventIds = new Set();

  entries.forEach((entry, index) => {
    const feature = toFeature(entry);
    const validation = validateEventFeature(feature);
    const eventId = feature.properties.event_id;

    if (validation.valid && eventIds.has(eventId)) {
      rejected.push({ index, errors: [{ path: "properties.event_id", message: "Duplicate event_id." }] });
      return;
    }

    if (!validation.valid) {
      rejected.push({ index, errors: validation.errors });
      return;
    }

    eventIds.add(eventId);
    features.push(feature);
  });

  return { features, rejected };
}

export function assertEventData(input) {
  const result = importEventData(input);
  if (result.rejected.length) throw new EventImportError(result.rejected);
  return result.features;
}
