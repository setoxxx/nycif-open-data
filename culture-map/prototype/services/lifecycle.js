import { eventInterval } from "./time.js";

export const SOURCE_EVENT_STATUSES = Object.freeze([
  "confirmed",
  "tentative",
  "unverified",
  "rescheduled",
  "postponed",
  "cancelled",
  "expired",
]);

export const LIFECYCLE_STATES = Object.freeze([
  "not-applicable",
  "malformed",
  "cancelled",
  "postponed",
  "expired",
  "active",
  "scheduled",
  "historical",
]);

const DEFAULT_HIDDEN_STATES = new Set(["malformed", "cancelled", "postponed", "expired"]);
const CHANGED_SOURCE_STATUSES = new Set(["rescheduled", "postponed", "cancelled"]);
const ATTENTION_SOURCE_STATUSES = new Set(["tentative", "unverified", "rescheduled", "postponed", "cancelled", "expired"]);
const TEMPORAL_FIELDS = ["start_date", "start_time", "end_date", "end_time"];

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

export function isEventLifecycleApplicable(feature) {
  const properties = feature?.properties;
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) return false;

  const layerKind = normalize(properties.cityEngine?.layerKind);
  if (layerKind) return layerKind === "experience";

  if (hasValue(properties.event_id)) return true;
  return TEMPORAL_FIELDS.some((field) => hasValue(properties[field]));
}

function presentation(state, sourceStatus) {
  if (state === "malformed") return {
    label: "Schedule needs review",
    notice: "This record has incomplete or contradictory schedule information and should not be published until it is corrected.",
    tone: "critical",
  };
  if (state === "cancelled") return {
    label: "Cancelled",
    notice: "This event was cancelled. Check the official source before making plans.",
    tone: "critical",
  };
  if (state === "postponed") return {
    label: "Postponed",
    notice: "This event was postponed and a replacement date may not yet be available.",
    tone: "warning",
  };
  if (state === "expired") return {
    label: "Expired",
    notice: "This listing is no longer active.",
    tone: "neutral",
  };
  if (state === "historical") return {
    label: "Past event",
    notice: "This event has ended and is shown for historical reference.",
    tone: "neutral",
  };
  if (sourceStatus === "rescheduled") return {
    label: state === "active" ? "Happening now · Rescheduled" : "Rescheduled",
    notice: "The schedule changed. Verify the updated time and location with the official source.",
    tone: "warning",
  };
  if (sourceStatus === "tentative") return {
    label: state === "active" ? "Happening now · Tentative" : "Tentative",
    notice: "The source marks this schedule as tentative. Confirm details before attending.",
    tone: "warning",
  };
  if (sourceStatus === "unverified") return {
    label: state === "active" ? "Happening now · Unverified" : "Unverified",
    notice: "This record has not yet completed verification against the listed source.",
    tone: "warning",
  };
  if (state === "active") return { label: "Happening now", notice: "", tone: "normal" };
  return { label: "Scheduled", notice: "", tone: "normal" };
}

export function sourceEventStatus(feature) {
  const status = normalize(feature?.properties?.status);
  return SOURCE_EVENT_STATUSES.includes(status) ? status : "unverified";
}

export function classifyEventLifecycle(feature, now = new Date()) {
  const applies = isEventLifecycleApplicable(feature);
  if (!applies) {
    return Object.freeze({
      applies: false,
      state: "not-applicable",
      sourceStatus: null,
      interval: null,
      isCurrent: true,
      isInspectable: true,
      isChanged: false,
      requiresAttention: false,
      defaultVisible: true,
      label: "",
      notice: "",
      tone: "normal",
    });
  }

  const interval = eventInterval(feature);
  const sourceStatus = sourceEventStatus(feature);

  let state;
  if (!interval) state = "malformed";
  else if (sourceStatus === "cancelled") state = "cancelled";
  else if (sourceStatus === "postponed") state = "postponed";
  else if (sourceStatus === "expired") state = "expired";
  else if (interval.end < now) state = "historical";
  else if (interval.start <= now && interval.end >= now) state = "active";
  else state = "scheduled";

  const display = presentation(state, sourceStatus);
  return Object.freeze({
    applies: true,
    state,
    sourceStatus,
    interval,
    isCurrent: state === "active" || state === "scheduled",
    isInspectable: true,
    isChanged: CHANGED_SOURCE_STATUSES.has(sourceStatus),
    requiresAttention: state === "malformed" || ATTENTION_SOURCE_STATUSES.has(sourceStatus),
    defaultVisible: !DEFAULT_HIDDEN_STATES.has(state),
    label: display.label,
    notice: display.notice,
    tone: display.tone,
  });
}

export function isEventVisibleByDefault(feature, now = new Date()) {
  return classifyEventLifecycle(feature, now).defaultVisible;
}

export function lifecycleLabel(feature, now = new Date()) {
  return classifyEventLifecycle(feature, now).label;
}

export function lifecycleNotice(feature, now = new Date()) {
  return classifyEventLifecycle(feature, now).notice;
}
