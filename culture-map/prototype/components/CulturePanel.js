// CulturePanel — optional Culture discovery mode for the City Engine map.
//
// Additive by design: it renders into its own panel and its own Leaflet layer.
// It never mutates the events place pipeline, never removes the existing
// filters, and "View all businesses" fully restores the base view.

import {
  availableTagsForArea,
  areaById,
  bestMatch,
  businessesForArea,
  reasonPhrase,
  tagLabel,
} from "../services/culture.js";

const STATE_MESSAGES = {
  loading: "Loading Culture feed…",
  ready: "Culture mode is optional. The complete map is shown when it is off.",
  no_profile: "No supported cultural profile is available for this area yet.",
  no_results: "No matching licensed businesses for the selected cultural categories.",
  stale: "The Culture feed is stale and was not loaded.",
  unsupported_schema: "The Culture feed schema is unsupported.",
  validation_failure: "The Culture feed did not pass validation.",
  network_failure: "The Culture feed could not be loaded.",
};

export function createCulturePanel(options) {
  const {
    toggleButton,
    panel,
    statusEl,
    areaSelect,
    areaMeta,
    categoriesEl,
    countEl,
    explainEl,
    sourcesEl,
    listEl,
    viewAllButton,
    closeButton,
    map = null,
    // Environment switch: entering Culture hides the Events environment; the
    // toggle button relabels so users know they can switch back.
    onEnterCulture = () => {},
    onExitCulture = () => {},
    cultureLabel = "Culture",
    eventsLabel = "Events",
  } = options;

  const hasLeaflet = map && typeof L !== "undefined";
  const businessLayer = hasLeaflet ? L.layerGroup() : null;
  // Floating neighborhood-name labels (Apple-Maps style) for every area in the feed.
  const neighborhoodLayer = hasLeaflet ? L.layerGroup() : null;
  let feed = null;
  let areaId = null;
  const selectedTags = new Set();
  let lastTrigger = null;

  function setStatus(name, extra) {
    if (!statusEl) return;
    statusEl.textContent = extra ? `${STATE_MESSAGES[name]} ${extra}` : STATE_MESSAGES[name] || name;
    statusEl.setAttribute("data-culture-state", name);
  }

  function open() {
    lastTrigger = document.activeElement;
    panel.hidden = false;
    toggleButton.setAttribute("aria-expanded", "true");
    toggleButton.setAttribute("aria-pressed", "true");
    // Switch the environment to Culture; the button now offers going back.
    toggleButton.textContent = eventsLabel;
    toggleButton.setAttribute("aria-label", "Switch back to Events");
    onEnterCulture();
    if (businessLayer && map) businessLayer.addTo(map);
    if (neighborhoodLayer && map) neighborhoodLayer.addTo(map);
    renderNeighborhoodLabels();
    render();
    const focusTarget = panel.querySelector("select, button, input");
    if (focusTarget) focusTarget.focus();
  }

  function close({ restoreFocus = true } = {}) {
    panel.hidden = true;
    toggleButton.setAttribute("aria-expanded", "false");
    toggleButton.setAttribute("aria-pressed", "false");
    // Switch the environment back to Events; relabel the button to Culture.
    toggleButton.textContent = cultureLabel;
    toggleButton.setAttribute("aria-label", "Switch to Culture");
    if (businessLayer) businessLayer.clearLayers();
    if (businessLayer && map) map.removeLayer(businessLayer);
    if (neighborhoodLayer) neighborhoodLayer.clearLayers();
    if (neighborhoodLayer && map) map.removeLayer(neighborhoodLayer);
    onExitCulture();
    if (restoreFocus && lastTrigger && typeof lastTrigger.focus === "function") lastTrigger.focus();
    else if (restoreFocus) toggleButton.focus();
  }

  function toggle() {
    if (panel.hidden) open();
    else close();
  }

  function setFeed(nextFeed) {
    feed = nextFeed;
    populateAreas();
    setStatus("ready");
    if (!panel.hidden) {
      renderNeighborhoodLabels();
      render();
    }
  }

  // Float each cultural neighborhood's name over its section of the map, so a
  // user can scroll around and see what each area is called (Apple-Maps style).
  function renderNeighborhoodLabels() {
    if (!neighborhoodLayer || !map || !feed) return;
    neighborhoodLayer.clearLayers();
    for (const area of feed.areas || []) {
      const p = area.label_point;
      if (!p || p.lat == null || p.lng == null) continue;
      L.marker([p.lat, p.lng], { opacity: 0, interactive: false, keyboard: false })
        .bindTooltip(area.geography_name, {
          permanent: true,
          direction: "center",
          className: "culture-hood-label",
        })
        .addTo(neighborhoodLayer);
    }
  }

  function setError(kind, failures) {
    feed = null;
    setStatus(kind, failures && failures.length ? `(${failures.join(", ")})` : "");
    if (listEl) listEl.innerHTML = "";
    if (countEl) countEl.textContent = "";
  }

  function populateAreas() {
    if (!feed || !areaSelect) return;
    areaSelect.innerHTML = "";
    for (const area of feed.areas) {
      const option = document.createElement("option");
      option.value = area.area_id;
      option.textContent = area.geography_name;
      areaSelect.append(option);
    }
    areaId = feed.areas.length ? feed.areas[0].area_id : null;
  }

  function renderCategories(tags) {
    categoriesEl.innerHTML = "";
    for (const tag of tags) {
      const label = document.createElement("label");
      label.className = "culture-category";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = tag;
      input.checked = selectedTags.has(tag);
      input.addEventListener("change", () => {
        if (input.checked) selectedTags.add(tag);
        else selectedTags.delete(tag);
        render();
      });
      label.append(input, document.createTextNode(` ${tagLabel(tag)}`));
      categoriesEl.append(label);
    }
  }

  function renderSources(area) {
    if (!sourcesEl) return;
    sourcesEl.innerHTML = "";
    for (const source of area.sources || []) {
      const p = document.createElement("p");
      p.className = "culture-source";
      const acs = source.acs_dataset
        ? ` · ${source.acs_dataset} ${source.acs_vintage || ""} [${(source.acs_variable_ids || []).join(", ")}]`
        : "";
      p.textContent = `${source.source_type}: ${source.source_reference}${acs}`;
      sourcesEl.append(p);
    }
  }

  function renderMarkers(entries) {
    if (!businessLayer || !map) return;
    businessLayer.clearLayers();
    const points = [];
    for (const { business } of entries) {
      if (!business.coordinates) continue;
      const marker = L.marker([business.coordinates.lat, business.coordinates.lng]);
      const tags = (business.cultural_tags || []).map(tagLabel).join(", ");
      marker.bindPopup(
        `<strong>${escapeHtml(business.business_name)}</strong><br>${escapeHtml(business.business_category || "")}<br>${escapeHtml(tags)}`,
      );
      marker.addTo(businessLayer);
      points.push([business.coordinates.lat, business.coordinates.lng]);
    }
    if (points.length) map.fitBounds(points, { padding: [40, 40], maxZoom: 14 });
  }

  function renderList(entries) {
    listEl.innerHTML = "";
    for (const { business, match } of entries) {
      const card = document.createElement("article");
      card.className = "culture-card";

      const title = document.createElement("h3");
      title.textContent = business.business_name;

      const meta = document.createElement("p");
      meta.className = "culture-card-meta";
      meta.textContent = `${business.business_category || ""} · ${business.community_district || ""}`;

      const badges = document.createElement("div");
      badges.className = "culture-badges";
      if (match) {
        const verified = match.disposition === "ACCEPTED";
        const badge = document.createElement("span");
        badge.className = `culture-badge ${verified ? "is-verified" : "is-review"}`;
        badge.textContent = verified
          ? match.reason_code === "ACCEPTED_VERIFIED_CERTIFICATION"
            ? "Verified"
            : "Confirmed"
          : "Manually reviewed";
        badges.append(badge);
      }
      for (const tag of business.cultural_tags || []) {
        const span = document.createElement("span");
        span.className = "culture-badge is-tag";
        span.textContent = tagLabel(tag);
        badges.append(span);
      }

      card.append(title, meta, badges);
      if (match) {
        const why = document.createElement("p");
        why.className = "culture-why";
        why.textContent = `Why included: ${reasonPhrase(match.reason_code)}${match.matched_tag ? ` · ${tagLabel(match.matched_tag)}` : ""}`;
        card.append(why);
      }
      listEl.append(card);
    }
  }

  function render() {
    if (!feed || !areaId) {
      setStatus("no_profile");
      return;
    }
    const area = areaById(feed, areaId);
    const tags = availableTagsForArea(feed, areaId);
    if (!area || !tags.length) {
      setStatus("no_profile");
      if (countEl) countEl.textContent = "";
      renderList([]);
      renderMarkers([]);
      return;
    }
    if (areaMeta) areaMeta.textContent = `Context strength: ${area.context_strength} · review: ${area.review_status}`;
    renderCategories(tags);
    renderSources(area);
    if (explainEl) {
      explainEl.textContent =
        "Results are licensed businesses whose documented evidence matches this area's cultural context. Verified = certification; Confirmed = advertised category in a strong area; Manually reviewed = editor-approved or lower-confidence.";
    }

    const entries = businessesForArea(feed, areaId, [...selectedTags]);
    if (countEl) countEl.textContent = `${entries.length} relevant business${entries.length === 1 ? "" : "es"}`;
    setStatus(entries.length ? "ready" : "no_results");
    renderList(entries);
    renderMarkers(entries);
  }

  // Wiring
  toggleButton.addEventListener("click", toggle);
  if (closeButton) closeButton.addEventListener("click", () => close());
  if (viewAllButton) viewAllButton.addEventListener("click", () => close());
  if (areaSelect) {
    areaSelect.addEventListener("change", (event) => {
      areaId = event.target.value;
      selectedTags.clear();
      render();
    });
  }
  panel.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });

  toggleButton.setAttribute("aria-expanded", "false");
  toggleButton.setAttribute("aria-pressed", "false");

  return { open, close, toggle, setFeed, setError };
}

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]),
  );
}
