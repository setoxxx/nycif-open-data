function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export const RENDERER_PRIORITY = Object.freeze(["editorial", "experience"]);

function layerKindsForPlace(place) {
  if (!place || !Array.isArray(place.experiences)) {
    throw new TypeError("Renderer requires a Place with experiences.");
  }

  return place.experiences
    .map((feature) => feature.properties?.cityEngine?.layerKind)
    .filter(Boolean);
}

export function selectRendererKind(place, priority = RENDERER_PRIORITY) {
  const kinds = layerKindsForPlace(place);
  return priority.find((kind) => kinds.includes(kind)) || kinds[0] || "experience";
}

export function createRendererRegistry(initialRenderers = {}, { priority = RENDERER_PRIORITY } = {}) {
  const renderers = new Map(Object.entries(initialRenderers));
  const rendererPriority = Object.freeze([...priority]);

  function register(kind, renderer) {
    if (typeof kind !== "string" || !kind.trim()) {
      throw new TypeError("Renderer kind must be a non-empty string.");
    }
    if (typeof renderer !== "function") {
      throw new TypeError(`Renderer for ${kind} must be a function.`);
    }
    if (renderers.has(kind)) {
      throw new Error(`Renderer already registered: ${kind}`);
    }

    renderers.set(kind, renderer);
    return renderer;
  }

  function get(kind) {
    return renderers.get(kind) || null;
  }

  function renderPlace(place) {
    const kind = selectRendererKind(place, rendererPriority);
    const renderer = get(kind);
    if (!renderer) {
      throw new Error(`No renderer registered for layer kind: ${kind}`);
    }

    return Object.freeze({ kind, ...renderer(place) });
  }

  return Object.freeze({ register, get, renderPlace });
}

export function renderExperiencePlace(place) {
  const count = place.experiences.length;
  return Object.freeze({
    marker: Object.freeze({
      title: place.name,
      keyboard: true,
    }),
    popupHtml: `<div class="marker-label">${escapeHtml(place.name)}</div><div class="marker-meta">${count} experience${count === 1 ? "" : "s"}</div>`,
  });
}

export function renderEditorialPlace(place) {
  const editorialFeatures = place.experiences.filter(
    (feature) => feature.properties?.cityEngine?.layerKind === "editorial",
  );
  const headline = editorialFeatures[0]?.properties?.headline || place.name;
  const count = editorialFeatures.length;

  return Object.freeze({
    marker: Object.freeze({
      title: headline,
      keyboard: true,
      riseOnHover: true,
    }),
    popupHtml: `<div class="marker-label">${escapeHtml(headline)}</div><div class="marker-meta">NYC In Focus reporting${count > 1 ? ` · ${count} stories` : ""}</div>`,
  });
}

export function createDefaultRendererRegistry() {
  return createRendererRegistry({
    editorial: renderEditorialPlace,
    experience: renderExperiencePlace,
  });
}
