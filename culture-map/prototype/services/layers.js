const REQUIRED_LAYER_FIELDS = ["id", "label", "kind", "source"];

function normalizeLayer(layer) {
  if (!layer || typeof layer !== "object" || Array.isArray(layer)) {
    throw new TypeError("Layer definitions must be objects.");
  }

  for (const field of REQUIRED_LAYER_FIELDS) {
    if (typeof layer[field] !== "string" || !layer[field].trim()) {
      throw new TypeError(`Layer definition requires a non-empty ${field}.`);
    }
  }

  return Object.freeze({
    enabled: true,
    visibleByDefault: false,
    display: {},
    eligibility: {},
    freshness: {},
    trust: {},
    ...layer,
    id: layer.id.trim(),
    label: layer.label.trim(),
    kind: layer.kind.trim(),
    source: layer.source.trim(),
  });
}

export function createLayerRegistry(initialLayers = []) {
  const layers = new Map();

  function register(layer) {
    const normalized = normalizeLayer(layer);
    if (layers.has(normalized.id)) {
      throw new Error(`Layer already registered: ${normalized.id}`);
    }

    layers.set(normalized.id, normalized);
    return normalized;
  }

  function get(layerId) {
    return layers.get(layerId) || null;
  }

  function has(layerId) {
    return layers.has(layerId);
  }

  function list({ enabledOnly = false } = {}) {
    const registered = [...layers.values()];
    return enabledOnly ? registered.filter((layer) => layer.enabled) : registered;
  }

  function unregister(layerId) {
    return layers.delete(layerId);
  }

  for (const layer of initialLayers) {
    register(layer);
  }

  return Object.freeze({ register, unregister, get, has, list });
}

export const eventsLayer = Object.freeze({
  id: "events",
  label: "Events",
  kind: "experience",
  source: "../map/sample-events.geojson",
  enabled: true,
  visibleByDefault: true,
  display: {
    geometry: ["Point"],
    renderer: "place-markers",
  },
  eligibility: {
    requiresGeometry: true,
    requiredProperties: ["event_id", "title", "start_date"],
  },
  freshness: {
    strategy: "time-window",
    checkedAtProperty: "last_checked",
  },
  trust: {
    statusProperty: "status",
    sourceNameProperty: "source_name",
    sourceUrlProperty: "official_source_url",
  },
});

export const jobsLayer = Object.freeze({
  id: "jobs",
  label: "Jobs",
  kind: "experience",
  source: "../map/sample-jobs.geojson",
  enabled: true,
  visibleByDefault: true,
  display: {
    geometry: ["Point"],
    renderer: "place-markers",
  },
  eligibility: {
    requiresGeometry: true,
    requiredProperties: ["event_id", "title", "start_date", "job_event_type"],
  },
  freshness: {
    strategy: "time-window",
    checkedAtProperty: "last_checked",
    sourceUpdatedAtProperty: "source_updated_at",
    ingestedAtProperty: "ingested_at",
  },
  trust: {
    statusProperty: "status",
    sourceNameProperty: "source_name",
    sourceUrlProperty: "official_source_url",
    registrationUrlProperty: "registration_url",
  },
});

export const editorialLayer = Object.freeze({
  id: "editorial",
  label: "NYC In Focus Reporting",
  kind: "editorial",
  source: "../map/sample-editorial.geojson",
  enabled: true,
  visibleByDefault: false,
  display: {
    geometry: ["Point", "LineString", "Polygon"],
    renderer: "editorial-overlays",
  },
  eligibility: {
    requiresGeometry: true,
    requiredProperties: ["story_id", "headline", "published_at"],
  },
  freshness: {
    strategy: "published-record",
    checkedAtProperty: "updated_at",
  },
  trust: {
    statusProperty: "editorial_status",
    sourceNameProperty: "publisher_name",
    sourceUrlProperty: "canonical_url",
  },
});

export function createDefaultLayerRegistry() {
  return createLayerRegistry([eventsLayer, jobsLayer, editorialLayer]);
}
