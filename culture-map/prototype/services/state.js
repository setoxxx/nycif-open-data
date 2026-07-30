const initialFilters = Object.freeze({
  query: "",
  date: "all",
  borough: "all",
  category: "all",
});

export function createStore() {
  let state = {
    features: [],
    filteredFeatures: [],
    places: [],
    filteredPlaces: [],
    unresolved: [],
    selectedPlaceId: null,
    selectedExperienceId: null,
    filters: { ...initialFilters },
  };

  const listeners = new Set();

  function getState() {
    return state;
  }

  function setState(patch) {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener(state));
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function resetFilters() {
    setState({
      filters: { ...initialFilters },
      selectedPlaceId: null,
      selectedExperienceId: null,
    });
  }

  return { getState, setState, subscribe, resetFilters };
}

export { initialFilters };
