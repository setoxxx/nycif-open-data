import { placeCoordinates, selectMapItems } from "../services/map-spatial.js";

const NYC_CENTER = [40.7128, -74.006];
const CLUSTER_CELL_SIZE = 64;
const MAX_RENDERED_ITEMS = 500;
const VIEWPORT_PADDING_RATIO = 0.15;
const PLACE_REVEAL_ZOOM = 18;

export function createMapView({ elementId = "map", onSelectPlace, rendererRegistry }) {
  if (!rendererRegistry || typeof rendererRegistry.renderPlace !== "function") {
    throw new TypeError("MapView requires a renderer registry.");
  }

  const map = L.map(elementId, { zoomControl: true, scrollWheelZoom: true }).setView(NYC_CENTER, 11);
  // Clean "day" basemap (CARTO Positron) — minimal light canvas so cultural
  // context and neighborhood labels read clearly.
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
  }).addTo(map);

  const markerLayer = L.layerGroup().addTo(map);
  const markers = new Map();
  const placesById = new Map();
  let currentPlaces = [];
  let revealedPlaceId = null;

  function currentMapBounds() {
    const bounds = map.getBounds();
    return {
      south: bounds.getSouth(),
      west: bounds.getWest(),
      north: bounds.getNorth(),
      east: bounds.getEast(),
    };
  }

  function markerSignature(item) {
    const experienceIds = item.type === "place"
      ? item.place.experiences.map((feature) => feature?.properties?.event_id ?? "").join(",")
      : item.places.map((place) => `${place.id}:${place.experiences.length}`).join(",");

    return [
      item.type,
      item.id,
      item.count,
      item.latitude.toFixed(6),
      item.longitude.toFixed(6),
      experienceIds,
    ].join("|");
  }

  function zoomToCluster(item) {
    const { south, west, north, east } = item.bounds;
    if (south === north && west === east) {
      map.setView([item.latitude, item.longitude], Math.min(19, map.getZoom() + 2));
      return;
    }

    map.fitBounds([[south, west], [north, east]], {
      padding: [48, 48],
      maxZoom: PLACE_REVEAL_ZOOM,
    });
  }

  function createClusterMarker(item) {
    const icon = L.divIcon({
      className: "map-cluster-marker",
      html: `<span>${item.count}</span>`,
      iconSize: [42, 42],
      iconAnchor: [21, 21],
    });

    return L.marker([item.latitude, item.longitude], {
      icon,
      keyboard: true,
      title: `${item.count} places. Activate to zoom in.`,
      alt: `${item.count} places`,
    }).on("click", () => zoomToCluster(item));
  }

  function createPlaceMarker(item) {
    const { place, latitude, longitude } = item;
    const renderSpec = rendererRegistry.renderPlace(place);
    const selectPlace = () => onSelectPlace(place.id, { pan: false, openPopup: false });
    let markerElement = null;

    function handleMarkerKeydown(event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      selectPlace();
    }

    const marker = L.marker([latitude, longitude], renderSpec.marker)
      .bindPopup(renderSpec.popupHtml)
      .on("click", selectPlace)
      .on("add", () => {
        markerElement = marker.getElement();
        markerElement?.addEventListener("keydown", handleMarkerKeydown);
      })
      .on("remove", () => {
        markerElement?.removeEventListener("keydown", handleMarkerKeydown);
        markerElement = null;
      });

    return marker;
  }

  function selectedPlaceItem() {
    if (!revealedPlaceId) return null;
    const place = placesById.get(revealedPlaceId);
    const coordinates = placeCoordinates(place);
    if (!place || !coordinates) return null;

    return {
      type: "place",
      id: `place:${place.id}`,
      place,
      places: [place],
      count: 1,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      bounds: {
        south: coordinates.latitude,
        west: coordinates.longitude,
        north: coordinates.latitude,
        east: coordinates.longitude,
      },
    };
  }

  function selectVisibleMapItems() {
    const bounds = currentMapBounds();
    const zoom = map.getZoom();
    const selectedItem = selectedPlaceItem();
    const clusterablePlaces = selectedItem
      ? currentPlaces.filter((place) => place.id !== selectedItem.place.id)
      : currentPlaces;

    const items = selectMapItems(clusterablePlaces, {
      bounds,
      zoom,
      cellSize: CLUSTER_CELL_SIZE,
      maxItems: selectedItem ? Math.max(1, MAX_RENDERED_ITEMS - 1) : MAX_RENDERED_ITEMS,
      paddingRatio: VIEWPORT_PADDING_RATIO,
    });

    return selectedItem ? [selectedItem, ...items] : items;
  }

  function syncMarkers() {
    const items = selectVisibleMapItems();
    const nextIds = new Set(items.map(({ id }) => id));

    for (const [id, entry] of markers) {
      if (nextIds.has(id)) continue;
      markerLayer.removeLayer(entry.marker);
      markers.delete(id);
    }

    items.forEach((item) => {
      const signature = markerSignature(item);
      const existing = markers.get(item.id);
      if (existing?.signature === signature) return;

      if (existing) markerLayer.removeLayer(existing.marker);
      const marker = item.type === "cluster"
        ? createClusterMarker(item)
        : createPlaceMarker(item);
      marker.addTo(markerLayer);
      markers.set(item.id, { marker, signature });
    });
  }

  function render(places) {
    currentPlaces = Array.isArray(places) ? places : [];
    placesById.clear();
    currentPlaces.forEach((place) => placesById.set(place.id, place));
    if (revealedPlaceId && !placesById.has(revealedPlaceId)) revealedPlaceId = null;

    const bounds = currentPlaces
      .map((place) => placeCoordinates(place))
      .filter(Boolean)
      .map(({ latitude, longitude }) => [latitude, longitude]);

    if (bounds.length === 1) map.setView(bounds[0], 14);
    else if (bounds.length > 1) map.fitBounds(bounds, { padding: [36, 36], maxZoom: 14 });

    syncMarkers();
  }

  function focusPlace(placeId, { pan = true, openPopup = true } = {}) {
    const place = placesById.get(placeId) || currentPlaces.find((item) => item.id === placeId);
    const coordinates = placeCoordinates(place);
    if (!place || !coordinates) return;

    revealedPlaceId = placeId;

    if (pan) {
      map.stop();
      map.setView(
        [coordinates.latitude, coordinates.longitude],
        PLACE_REVEAL_ZOOM,
        { animate: false, reset: true },
      );
    }

    syncMarkers();
    const marker = markers.get(`place:${placeId}`)?.marker;
    if (marker && openPopup) marker.openPopup();
  }

  map.on("moveend", syncMarkers);

  // Expose the Leaflet map so additive overlays (e.g. Culture mode) can attach
  // their own layer group without disturbing the events marker pipeline.
  function getMap() {
    return map;
  }

  // Show/hide the Events marker layer so the Culture environment can take over
  // the shared map without destroying the events state.
  function setBaseVisible(visible) {
    if (!map || !markerLayer) return;
    if (visible && !map.hasLayer(markerLayer)) markerLayer.addTo(map);
    if (!visible && map.hasLayer(markerLayer)) map.removeLayer(markerLayer);
  }

  return { render, focusPlace, getMap, setBaseVisible };
}
