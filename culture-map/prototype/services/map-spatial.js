const TILE_SIZE = 256;
const MAX_MERCATOR_LATITUDE = 85.05112878;

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function placeCoordinates(place) {
  const coordinates = place?.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

  const [longitude, latitude] = coordinates;
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;
  if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) return null;

  return { longitude, latitude };
}

export function padMapBounds(bounds, paddingRatio = 0.15) {
  if (!bounds) return null;

  const south = Number(bounds.south);
  const west = Number(bounds.west);
  const north = Number(bounds.north);
  const east = Number(bounds.east);
  if (![south, west, north, east].every(Number.isFinite)) return null;

  const latitudePadding = Math.max(0, north - south) * Math.max(0, paddingRatio);
  const longitudePadding = Math.max(0, east - west) * Math.max(0, paddingRatio);

  return {
    south: clamp(south - latitudePadding, -90, 90),
    west: clamp(west - longitudePadding, -180, 180),
    north: clamp(north + latitudePadding, -90, 90),
    east: clamp(east + longitudePadding, -180, 180),
  };
}

export function filterPlacesByBounds(places = [], bounds, options = {}) {
  const paddedBounds = padMapBounds(bounds, options.paddingRatio);
  if (!paddedBounds) return places.filter((place) => placeCoordinates(place));

  return places.filter((place) => {
    const coordinates = placeCoordinates(place);
    if (!coordinates) return false;

    return coordinates.latitude >= paddedBounds.south &&
      coordinates.latitude <= paddedBounds.north &&
      coordinates.longitude >= paddedBounds.west &&
      coordinates.longitude <= paddedBounds.east;
  });
}

export function projectToWorldPixel(longitude, latitude, zoom = 0) {
  const safeZoom = Math.max(0, Number.isFinite(zoom) ? zoom : 0);
  const scale = TILE_SIZE * (2 ** safeZoom);
  const safeLatitude = clamp(latitude, -MAX_MERCATOR_LATITUDE, MAX_MERCATOR_LATITUDE);
  const latitudeRadians = safeLatitude * Math.PI / 180;

  return {
    x: ((longitude + 180) / 360) * scale,
    y: (1 - Math.log(Math.tan(latitudeRadians) + (1 / Math.cos(latitudeRadians))) / Math.PI) / 2 * scale,
  };
}

function placeSortKey(place) {
  return String(place?.id ?? "");
}

function itemBounds(entries) {
  const latitudes = entries.map(({ coordinates }) => coordinates.latitude);
  const longitudes = entries.map(({ coordinates }) => coordinates.longitude);
  return {
    south: Math.min(...latitudes),
    west: Math.min(...longitudes),
    north: Math.max(...latitudes),
    east: Math.max(...longitudes),
  };
}

function clusterEntries(entries, zoom, cellX, cellY) {
  const orderedEntries = [...entries].sort((left, right) =>
    placeSortKey(left.place).localeCompare(placeSortKey(right.place)),
  );
  const latitude = orderedEntries.reduce((sum, entry) => sum + entry.coordinates.latitude, 0) / orderedEntries.length;
  const longitude = orderedEntries.reduce((sum, entry) => sum + entry.coordinates.longitude, 0) / orderedEntries.length;
  const bounds = itemBounds(orderedEntries);

  if (orderedEntries.length === 1) {
    const [{ place }] = orderedEntries;
    return {
      type: "place",
      id: `place:${place.id}`,
      place,
      places: [place],
      count: 1,
      latitude,
      longitude,
      bounds,
    };
  }

  return {
    type: "cluster",
    id: `cluster:${zoom}:${cellX}:${cellY}`,
    places: orderedEntries.map(({ place }) => place),
    count: orderedEntries.length,
    latitude,
    longitude,
    bounds,
  };
}

export function clusterPlaces(places = [], options = {}) {
  const zoom = Math.max(0, Math.floor(Number.isFinite(options.zoom) ? options.zoom : 11));
  const cellSize = Math.max(16, Number.isFinite(options.cellSize) ? options.cellSize : 64);
  const maxItems = Math.max(1, Math.floor(Number.isFinite(options.maxItems) ? options.maxItems : 500));
  const groups = new Map();

  places.forEach((place) => {
    const coordinates = placeCoordinates(place);
    if (!coordinates) return;

    const pixel = projectToWorldPixel(coordinates.longitude, coordinates.latitude, zoom);
    const cellX = Math.floor(pixel.x / cellSize);
    const cellY = Math.floor(pixel.y / cellSize);
    const key = `${cellX}:${cellY}`;
    if (!groups.has(key)) groups.set(key, { cellX, cellY, entries: [] });
    groups.get(key).entries.push({ place, coordinates });
  });

  return [...groups.values()]
    .map(({ cellX, cellY, entries }) => clusterEntries(entries, zoom, cellX, cellY))
    .sort((left, right) => right.count - left.count || left.id.localeCompare(right.id))
    .slice(0, maxItems);
}

export function selectMapItems(places = [], options = {}) {
  const visiblePlaces = filterPlacesByBounds(places, options.bounds, {
    paddingRatio: options.paddingRatio,
  });

  return clusterPlaces(visiblePlaces, {
    zoom: options.zoom,
    cellSize: options.cellSize,
    maxItems: options.maxItems,
  });
}
