import { createCulturePanel } from "./components/CulturePanel.js";
import { createFilterBar } from "./components/FilterBar.js";
import { createMapView } from "./components/MapView.js";
import { createPlaceDetail } from "./components/PlaceDetail.js";
import { createPlaceList } from "./components/PlaceList.js";
import { eventId, loadFeatureCollection } from "./services/data.js";
import { filterFeatures } from "./services/filters.js";
import { createLayerEngine } from "./services/layer-engine.js";
import { createDefaultLayerRegistry } from "./services/layers.js";
import { findPlaceByExperienceId, resolvePlaces } from "./services/places.js";
import { createDefaultRendererRegistry } from "./services/renderers.js";
import { createStore } from "./services/state.js";
import { loadCultureFeed } from "./services/culture.js";

const CULTURE_RELEASE_URL = "data/culture-feed-release.sample.json";
const CULTURE_FEED_URL = "data/culture-feed.sample.json";

export async function bootstrap() {
  const store = createStore();
  const layerRegistry = createDefaultLayerRegistry();
  const layerEngine = createLayerEngine({
    registry: layerRegistry,
    loadLayer: (layer) => loadFeatureCollection(layer.source, { layerKind: layer.kind }),
  });
  const rendererRegistry = createDefaultRendererRegistry();

  const elements = {
    search: document.querySelector("#search-filter"),
    date: document.querySelector("#date-filter"),
    borough: document.querySelector("#borough-filter"),
    category: document.querySelector("#category-filter"),
    reset: document.querySelector("#reset-filters"),
    list: document.querySelector("#experience-list"),
    summary: document.querySelector("#results-summary"),
    detail: document.querySelector("#selected-experience"),
    template: document.querySelector("#experience-card-template"),
  };

  const mapView = createMapView({
    elementId: "map",
    onSelectPlace: selectPlace,
    rendererRegistry,
  });
  const placeList = createPlaceList({
    listElement: elements.list,
    templateElement: elements.template,
    onSelectPlace: selectPlace,
  });
  const placeDetail = createPlaceDetail({
    element: elements.detail,
    onSelectExperience: selectExperience,
  });
  const filterBar = createFilterBar({
    search: elements.search,
    date: elements.date,
    borough: elements.borough,
    category: elements.category,
    reset: elements.reset,
    onChange: applyFilters,
    onReset(filters) {
      store.resetFilters();
      applyFilters(filters);
    },
  });

  function renderSelection() {
    const state = store.getState();
    const place = state.filteredPlaces.find((item) => item.id === state.selectedPlaceId) || null;
    placeList.render(state.filteredPlaces, state.selectedPlaceId);
    placeDetail.render(place, state.selectedExperienceId);
  }

  function selectPlace(placeId, options = {}) {
    const state = store.getState();
    const place = state.filteredPlaces.find((item) => item.id === placeId);
    if (!place) return;

    const selectedExperienceId = eventId(place.experiences[0]);
    store.setState({ selectedPlaceId: placeId, selectedExperienceId });
    renderSelection();
    mapView.focusPlace(placeId, options);
    placeList.focusPlace(placeId);
  }

  function selectExperience(experienceId) {
    const state = store.getState();
    const place = findPlaceByExperienceId(state.filteredPlaces, experienceId);
    if (!place) return;

    store.setState({ selectedPlaceId: place.id, selectedExperienceId: experienceId });
    renderSelection();
  }

  function applyFilters(filters = filterBar.read()) {
    const state = store.getState();
    const filteredFeatures = filterFeatures(state.features, filters);
    const { places: filteredPlaces } = resolvePlaces(filteredFeatures);
    const selectedPlace = filteredPlaces.find((place) => place.id === state.selectedPlaceId) || null;
    const selectedExperienceStillVisible = selectedPlace?.experiences.some(
      (feature) => eventId(feature) === state.selectedExperienceId,
    );
    const selectedExperienceId = selectedPlace
      ? selectedExperienceStillVisible
        ? state.selectedExperienceId
        : eventId(selectedPlace.experiences[0])
      : null;

    store.setState({
      filters,
      filteredFeatures,
      filteredPlaces,
      selectedPlaceId: selectedPlace?.id || null,
      selectedExperienceId,
    });

    mapView.render(filteredPlaces);
    renderSelection();
    elements.summary.textContent = `${filteredPlaces.length} place${filteredPlaces.length === 1 ? "" : "s"} · ${filteredFeatures.length} of ${state.features.length} sample experiences`;
  }

  // --- Culture environment switch (Culture <-> Events on the shared map) ---
  const eventsListPanel = document.querySelector(".list-panel");
  const eventsDetailPanel = document.querySelector("#selected-experience");
  const root = document.querySelector("main");

  const culturePanel = createCulturePanel({
    toggleButton: document.querySelector("#culture-toggle"),
    panel: document.querySelector("#culture-panel"),
    statusEl: document.querySelector("#culture-status"),
    areaSelect: document.querySelector("#culture-area"),
    areaMeta: document.querySelector("#culture-area-meta"),
    categoriesEl: document.querySelector("#culture-categories"),
    countEl: document.querySelector("#culture-count"),
    explainEl: document.querySelector("#culture-explain"),
    sourcesEl: document.querySelector("#culture-sources"),
    listEl: document.querySelector("#culture-list"),
    viewAllButton: document.querySelector("#culture-view-all"),
    closeButton: document.querySelector("#culture-close"),
    nameMatchToggle: document.querySelector("#culture-namematch"),
    map: mapView.getMap(),
    cultureLabel: "Culture",
    eventsLabel: "Events",
    onEnterCulture() {
      // Hand the shared map to the Culture environment; hide the Events UI.
      if (root) root.setAttribute("data-environment", "culture");
      mapView.setBaseVisible(false);
      if (eventsListPanel) eventsListPanel.hidden = true;
      if (eventsDetailPanel) eventsDetailPanel.hidden = true;
    },
    onExitCulture() {
      // Restore the Events environment.
      if (root) root.setAttribute("data-environment", "events");
      mapView.setBaseVisible(true);
      if (eventsListPanel) eventsListPanel.hidden = false;
      if (eventsDetailPanel) eventsDetailPanel.hidden = false;
    },
  });

  loadCultureFeed({ releaseUrl: CULTURE_RELEASE_URL, feedUrl: CULTURE_FEED_URL })
    .then((feed) => culturePanel.setFeed(feed))
    .catch((error) => culturePanel.setError(error.kind || "network_failure", error.failures));

  try {
    const loadedLayers = await layerEngine.loadActiveLayers();
    const features = loadedLayers.flatMap(({ records }) => records);
    const { places, unresolved } = resolvePlaces(features);
    store.setState({ features, filteredFeatures: features, places, filteredPlaces: places, unresolved });
    filterBar.setOptions(features);
    applyFilters();

    if (unresolved.length) {
      console.warn(`${unresolved.length} sample record(s) could not be resolved to a Place.`);
    }
  } catch (error) {
    console.error(error);
    elements.summary.textContent = "Sample data could not be loaded.";
    placeList.showError("Run the repository from a local web server rather than opening the HTML file directly.");
  }

  return {
    store,
    layerRegistry,
    layerEngine,
    rendererRegistry,
    mapView,
    placeList,
    placeDetail,
    filterBar,
    culturePanel,
  };
}
