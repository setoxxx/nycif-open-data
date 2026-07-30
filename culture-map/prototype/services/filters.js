import { isEventVisibleByDefault } from "./lifecycle.js";
import { rankFeaturesBySearch, scoreSearchMatch } from "./search.js";
import { TIME_WINDOW_KINDS, matchesTimeWindow } from "./time.js";

const TIME_WINDOW_KIND_SET = new Set(TIME_WINDOW_KINDS);

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeDateFilter(value) {
  const normalized = normalize(value) || "all";
  return TIME_WINDOW_KIND_SET.has(normalized) ? normalized : "all";
}

function isValidFeature(feature) {
  return Boolean(
    feature
    && typeof feature === "object"
    && !Array.isArray(feature)
    && feature.properties
    && typeof feature.properties === "object"
    && !Array.isArray(feature.properties),
  );
}

export function matchesFilters(feature, filters = {}, now = new Date()) {
  if (!isValidFeature(feature)) return false;

  const properties = feature.properties;
  const query = String(filters.query ?? "").trim();
  const dateFilter = normalizeDateFilter(filters.date);

  if (dateFilter === "all" && !isEventVisibleByDefault(feature, now)) return false;
  if (query && scoreSearchMatch(feature, query) === 0) return false;
  if (filters.borough && filters.borough !== "all" && properties.borough !== filters.borough) return false;
  if (filters.category && filters.category !== "all" && properties.category !== filters.category) return false;

  return matchesTimeWindow(feature, dateFilter, now);
}

export function filterFeatures(features = [], filters = {}, now = new Date()) {
  const matched = features.filter((feature) => matchesFilters(feature, filters, now));
  return rankFeaturesBySearch(matched, filters.query);
}
