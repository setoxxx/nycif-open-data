import { eventId } from "./data.js";

const COORDINATE_PRECISION = 4;

function normalizedText(value = "") {
  return String(value).trim().toLowerCase().replace(/\s+/g, " ");
}

function coordinateKey(feature) {
  const coordinates = feature.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return "";

  const [longitude, latitude] = coordinates;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return "";

  return `${latitude.toFixed(COORDINATE_PRECISION)},${longitude.toFixed(COORDINATE_PRECISION)}`;
}

export function placeKey(feature) {
  const properties = feature.properties || {};
  const explicitId = normalizedText(properties.place_id);
  if (explicitId) return `id:${explicitId}`;

  const coordinates = coordinateKey(feature);
  const address = normalizedText(properties.address);
  if (coordinates && address) return `geo-address:${coordinates}:${address}`;
  if (coordinates) return `geo:${coordinates}`;

  const fallback = [
    normalizedText(properties.neighborhood),
    normalizedText(properties.borough),
  ].filter(Boolean).join(":");

  return fallback ? `area:${fallback}` : "";
}

function stablePlaceId(key) {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `place_${(hash >>> 0).toString(36)}`;
}

function placeName(feature) {
  const properties = feature.properties || {};
  return properties.place_name || properties.neighborhood || properties.address || properties.borough || "New York City";
}

export function resolvePlaces(features) {
  const places = new Map();
  const unresolved = [];

  features.forEach((feature) => {
    const experienceId = eventId(feature);
    const key = placeKey(feature);

    if (!experienceId || !key) {
      unresolved.push(feature);
      return;
    }

    if (!places.has(key)) {
      const properties = feature.properties || {};
      places.set(key, {
        id: properties.place_id || stablePlaceId(key),
        key,
        name: placeName(feature),
        borough: properties.borough || "",
        neighborhood: properties.neighborhood || "",
        address: properties.address || "",
        geometry: feature.geometry,
        experiences: [],
      });
    }

    places.get(key).experiences.push(feature);
  });

  return {
    places: [...places.values()].sort((a, b) => a.name.localeCompare(b.name)),
    unresolved,
  };
}

export function findPlaceByExperienceId(places, experienceId) {
  return places.find((place) => place.experiences.some((feature) => eventId(feature) === experienceId)) || null;
}
