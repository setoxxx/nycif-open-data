import { assertEventData } from "../data/event-import-pipeline.mjs";

function validateGenericFeatureCollection(data) {
  if (!data || data.type !== "FeatureCollection" || !Array.isArray(data.features)) {
    throw new Error("Data must be a GeoJSON FeatureCollection.");
  }

  const invalidIndex = data.features.findIndex((feature) =>
    !feature || feature.type !== "Feature" || typeof feature.properties !== "object",
  );
  if (invalidIndex >= 0) {
    throw new Error(`FeatureCollection contains an invalid feature at index ${invalidIndex}.`);
  }

  return data.features;
}

export function validateFeatureCollection(data, { layerKind = "experience" } = {}) {
  return layerKind === "experience"
    ? assertEventData(data)
    : validateGenericFeatureCollection(data);
}

export async function loadFeatureCollection(url, options = {}) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Data request failed with status ${response.status}.`);
  }

  return validateFeatureCollection(await response.json(), options);
}

export function eventId(feature) {
  return feature?.properties?.event_id || feature?.id || null;
}
