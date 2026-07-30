function annotateRecord(layer, record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new TypeError(`Layer ${layer.id} returned an invalid record.`);
  }

  const cityEngine = Object.freeze({
    layerId: layer.id,
    layerKind: layer.kind,
  });

  const properties = Object.freeze({
    ...(record.properties || {}),
    cityEngine,
  });

  return Object.freeze({
    ...record,
    properties,
  });
}

function annotateRecords(layer, records) {
  if (!Array.isArray(records)) {
    throw new TypeError(`Layer ${layer.id} loader must return an array of records.`);
  }

  return Object.freeze(records.map((record) => annotateRecord(layer, record)));
}

export function createLayerEngine({ registry, loadLayer }) {
  if (!registry || typeof registry.list !== "function" || typeof registry.get !== "function") {
    throw new TypeError("Layer Engine requires a valid registry.");
  }

  if (typeof loadLayer !== "function") {
    throw new TypeError("Layer Engine requires a layer loader.");
  }

  function getActiveLayers() {
    return registry.list({ enabledOnly: true });
  }

  async function load(layerId) {
    const layer = registry.get(layerId);
    if (!layer) {
      throw new Error(`Unknown layer: ${layerId}`);
    }

    if (!layer.enabled) {
      throw new Error(`Layer is disabled: ${layerId}`);
    }

    const loadedRecords = await loadLayer(layer);
    const records = annotateRecords(layer, loadedRecords);
    return Object.freeze({ layer, records });
  }

  async function loadActiveLayers() {
    return Object.freeze(await Promise.all(getActiveLayers().map((layer) => load(layer.id))));
  }

  return Object.freeze({ getActiveLayers, load, loadActiveLayers });
}
