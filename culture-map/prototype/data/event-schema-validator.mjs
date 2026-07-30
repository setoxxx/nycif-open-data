const EVENT_CATEGORIES = new Set([
  "Arts & Culture",
  "Civic / Public Meeting",
  "Festival / Street Fair",
  "Parade / March / Procession",
  "Parks / Outdoors",
  "Photo Opportunity",
  "Sports Culture",
  "Transit / Street Closure",
  "Family",
  "Jobs",
  "Other",
]);

const JOB_EVENT_TYPES = new Set([
  "job-fair",
  "hiring-event",
  "recruitment",
  "workshop",
  "information-session",
  "workforce-event",
]);

const BOROUGHS = new Set([
  "Manhattan",
  "Brooklyn",
  "Queens",
  "Bronx",
  "Staten Island",
  "Citywide",
  "Unspecified",
]);

const STATUSES = new Set([
  "confirmed",
  "tentative",
  "unverified",
  "cancelled",
  "postponed",
  "rescheduled",
  "expired",
]);
const REQUIRED_FIELDS = [
  "event_id",
  "title",
  "category",
  "start_date",
  "borough",
  "latitude",
  "longitude",
  "source_name",
  "source_url",
  "last_checked",
  "status",
  "public_display_eligible",
];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]?\d|2[0-3]):[0-5]\d$/;

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isValidUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function addError(errors, path, message) {
  errors.push({ path, message });
}

export function validateEventRecord(record) {
  const errors = [];

  if (!isRecord(record)) {
    return { valid: false, errors: [{ path: "$", message: "Event must be an object." }] };
  }

  for (const field of REQUIRED_FIELDS) {
    if (!(field in record)) {
      addError(errors, field, "Required field is missing.");
    }
  }

  if ("event_id" in record && (typeof record.event_id !== "string" || !record.event_id.trim())) {
    addError(errors, "event_id", "Must be a non-empty string.");
  }

  if ("title" in record && (typeof record.title !== "string" || record.title.trim().length < 3)) {
    addError(errors, "title", "Must be a string with at least 3 characters.");
  }

  if ("category" in record && !EVENT_CATEGORIES.has(record.category)) {
    addError(errors, "category", "Must be a supported NYCIF event category.");
  }

  if ("job_event_type" in record && !JOB_EVENT_TYPES.has(record.job_event_type)) {
    addError(errors, "job_event_type", "Must be a supported Jobs event type.");
  }

  if (record.category === "Jobs" && !("job_event_type" in record)) {
    addError(errors, "job_event_type", "Jobs records require a Jobs event type.");
  }

  if ("borough" in record && !BOROUGHS.has(record.borough)) {
    addError(errors, "borough", "Must be a supported NYC borough value.");
  }

  if ("status" in record && !STATUSES.has(record.status)) {
    addError(errors, "status", "Must be a supported event status.");
  }

  if ("start_date" in record && (typeof record.start_date !== "string" || !DATE_PATTERN.test(record.start_date))) {
    addError(errors, "start_date", "Must use YYYY-MM-DD format.");
  }

  for (const field of ["start_time", "end_time"]) {
    if (field in record && record[field] !== "" && (typeof record[field] !== "string" || !TIME_PATTERN.test(record[field]))) {
      addError(errors, field, "Must use 24-hour HH:MM format.");
    }
  }

  if ("latitude" in record && (typeof record.latitude !== "number" || record.latitude < 40.45 || record.latitude > 40.95)) {
    addError(errors, "latitude", "Must be a number within the NYC latitude bounds.");
  }

  if ("longitude" in record && (typeof record.longitude !== "number" || record.longitude < -74.3 || record.longitude > -73.65)) {
    addError(errors, "longitude", "Must be a number within the NYC longitude bounds.");
  }

  for (const field of ["source_url", "official_source_url", "registration_url", "nycif_url"]) {
    if (field in record && record[field] !== "" && (typeof record[field] !== "string" || !isValidUrl(record[field]))) {
      addError(errors, field, "Must be a valid absolute URL.");
    }
  }

  for (const field of ["last_checked", "source_updated_at", "ingested_at"]) {
    if (field in record && (typeof record[field] !== "string" || Number.isNaN(Date.parse(record[field])))) {
      addError(errors, field, "Must be a valid date-time string.");
    }
  }

  if ("public_display_eligible" in record && typeof record.public_display_eligible !== "boolean") {
    addError(errors, "public_display_eligible", "Must be a boolean.");
  }

  return { valid: errors.length === 0, errors };
}

export function validateEventFeature(feature) {
  const errors = [];

  if (!isRecord(feature) || feature.type !== "Feature") {
    return { valid: false, errors: [{ path: "$", message: "Entry must be a GeoJSON Feature." }] };
  }

  if (!isRecord(feature.geometry) || feature.geometry.type !== "Point" || !Array.isArray(feature.geometry.coordinates) || feature.geometry.coordinates.length !== 2) {
    addError(errors, "geometry", "Geometry must be a GeoJSON Point with [longitude, latitude].");
  }

  const recordResult = validateEventRecord(feature.properties);
  errors.push(...recordResult.errors.map((error) => ({ ...error, path: `properties.${error.path}` })));

  if (recordResult.valid && isRecord(feature.geometry) && Array.isArray(feature.geometry.coordinates)) {
    const [longitude, latitude] = feature.geometry.coordinates;
    if (longitude !== feature.properties.longitude || latitude !== feature.properties.latitude) {
      addError(errors, "geometry.coordinates", "Coordinates must match properties.longitude and properties.latitude.");
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateEventFeatureCollection(collection) {
  if (!isRecord(collection) || collection.type !== "FeatureCollection" || !Array.isArray(collection.features)) {
    return { valid: false, errors: [{ path: "$", message: "Input must be a GeoJSON FeatureCollection." }] };
  }

  const errors = [];
  const ids = new Set();

  collection.features.forEach((feature, index) => {
    const result = validateEventFeature(feature);
    errors.push(...result.errors.map((error) => ({ ...error, path: `features[${index}].${error.path}` })));

    const eventId = feature?.properties?.event_id;
    if (typeof eventId === "string") {
      if (ids.has(eventId)) {
        addError(errors, `features[${index}].properties.event_id`, "Duplicate event_id.");
      }
      ids.add(eventId);
    }
  });

  return { valid: errors.length === 0, errors };
}
