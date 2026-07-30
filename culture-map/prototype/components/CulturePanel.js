// CulturePanel — optional Culture discovery mode for the City Engine map.
//
// Additive by design: it renders into its own panel and its own Leaflet layer.
// It never mutates the events place pipeline, never removes the existing
// filters, and "View all businesses" fully restores the base view.

import {
  availableTagsForArea,
  availableTagsAll,
  allDisplayBusinesses,
  areaById,
  bestMatch,
  businessesForArea,
  reasonPhrase,
  tagLabel,
} from "../services/culture.js";

const ALL_AREAS = "__all__";

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
    nameMatchToggle = null,
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
  // Universal amenities (pet stores + pet parks) shown in every neighborhood.
  const universalLayer = hasLeaflet ? L.layerGroup() : null;
  // Unverified name-match candidates — clearly-distinct "possible" pins.
  const nameMatchLayer = hasLeaflet ? L.layerGroup() : null;
  let feed = null;
  let areaId = null;
  let hoodLabels = [];
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
    if (universalLayer && map) universalLayer.addTo(map);
    if (nameMatchLayer && map) nameMatchLayer.addTo(map);
    if (neighborhoodLayer && map) neighborhoodLayer.addTo(map);
    renderUniversal();
    renderNameMatches();
    renderNeighborhoodLabels();
    if (map) {
      map.on("moveend zoomend", declutterLabels);
      requestAnimationFrame(declutterLabels); // ensure tooltip DOM is measured
    }
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
    if (universalLayer) universalLayer.clearLayers();
    if (universalLayer && map) map.removeLayer(universalLayer);
    if (nameMatchLayer) nameMatchLayer.clearLayers();
    if (nameMatchLayer && map) map.removeLayer(nameMatchLayer);
    if (map) map.off("moveend zoomend", declutterLabels);
    hoodLabels = [];
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
      renderUniversal();
      renderNameMatches();
      renderNeighborhoodLabels();
      if (map) requestAnimationFrame(declutterLabels);
      render();
    }
  }

  // Float each cultural neighborhood's name over its section of the map, so a
  // user can scroll around and see what each area is called (Apple-Maps style).
  const STRENGTH_RANK = { strong: 3, moderate: 2, weak: 1 };

  function labelName(area) {
    // Drop the parenthetical qualifier for a cleaner map label.
    return String(area.geography_name || "").split("(")[0].trim();
  }

  function boroughSlug(borough) {
    return "hood-" + String(borough || "").trim().toLowerCase().replace(/\s+/g, "-");
  }

  function estimateSize(name) {
    // Sized for the big/bold uppercase poster-style labels.
    const charW = 9.2;
    const maxW = 150;
    const full = name.length * charW;
    const w = Math.min(maxW, full) + 10;
    const lines = Math.max(1, Math.ceil(full / maxW));
    return { w, h: lines * 18 + 6 };
  }

  // Universal "everyone uses them" places (pet stores + pet parks) in every
  // neighborhood, styled neutrally so they read as shared amenities.
  function renderUniversal() {
    if (!universalLayer || !map || !feed) return;
    universalLayer.clearLayers();
    for (const place of feed.universal_places || []) {
      const c = place.coordinates;
      if (!c || c.lat == null || c.lng == null) continue;
      const isPark = place.place_type === "pet_park";
      const icon = L.divIcon({
        className: "culture-universal-pin",
        html: isPark ? "🐾" : "🐾",
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      L.marker([c.lat, c.lng], { icon, keyboard: false })
        .bindPopup(
          `<strong>${escapeHtml(place.name || "")}</strong><br>${isPark ? "Pet park / dog run" : "Pet store"} · for everyone`,
        )
        .addTo(universalLayer);
    }
  }

  // Unverified name-match candidates as clearly-distinct dashed amber "?" pins.
  // Never styled like a verified business; the popup states it is unconfirmed.
  function renderNameMatches() {
    if (!nameMatchLayer || !map || !feed) return;
    nameMatchLayer.clearLayers();
    if (nameMatchToggle && !nameMatchToggle.checked) return;
    for (const place of feed.name_lead_places || []) {
      const c = place.coordinates;
      if (!c || c.lat == null || c.lng == null) continue;
      const icon = L.divIcon({ className: "culture-namematch-pin", html: "?", iconSize: [22, 22], iconAnchor: [11, 11] });
      L.marker([c.lat, c.lng], { icon, keyboard: false })
        .bindPopup(
          `<strong>${escapeHtml(place.name || "")}</strong><br>` +
            `<em>Possible match — unverified</em><br>` +
            `Name suggests: ${escapeHtml(tagLabel(place.hinted_tag))}<br>` +
            `Not a confirmed cultural business — needs evidence.`,
        )
        .addTo(nameMatchLayer);
    }
  }

  function renderNeighborhoodLabels() {
    if (!neighborhoodLayer || !map || !feed) return;
    neighborhoodLayer.clearLayers();
    hoodLabels = [];
    for (const area of feed.areas || []) {
      const p = area.label_point;
      if (!p || p.lat == null || p.lng == null) continue;
      const name = labelName(area);
      const marker = L.marker([p.lat, p.lng], { opacity: 0, interactive: false, keyboard: false })
        .bindTooltip(name, {
          permanent: true,
          direction: "center",
          className: `culture-hood-label ${boroughSlug(area.borough)}`,
        })
        .addTo(neighborhoodLayer);
      hoodLabels.push({
        marker,
        latlng: [p.lat, p.lng],
        size: estimateSize(name),
        // Priority: busier + better-documented corridors win a contested spot.
        priority: (area.business_count || 0) * 10 + (STRENGTH_RANK[area.context_strength] || 0),
      });
    }
    declutterLabels();
  }

  // Apple-style declutter: place labels by priority, hiding any that would
  // overlap one already placed. Re-run on every pan/zoom so more names reveal
  // as you zoom in.
  function declutterLabels() {
    if (!map || !hoodLabels.length) return;
    const placed = [];
    const overlaps = (b) =>
      placed.some(
        (p) => !(b.x + b.w < p.x || b.x > p.x + p.w || b.y + b.h < p.y || b.y > p.y + p.h),
      );
    for (const item of [...hoodLabels].sort((a, b) => b.priority - a.priority)) {
      const el = item.marker.getTooltip() && item.marker.getTooltip().getElement();
      if (!el) continue;
      const pt = map.latLngToContainerPoint(item.latlng);
      const box = { x: pt.x - item.size.w / 2, y: pt.y - item.size.h / 2, w: item.size.w, h: item.size.h };
      if (overlaps(box)) {
        el.style.display = "none";
      } else {
        el.style.display = "";
        placed.push(box);
      }
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
    // Default view shows every business across all neighborhoods at once.
    const all = document.createElement("option");
    all.value = ALL_AREAS;
    all.textContent = "All neighborhoods";
    areaSelect.append(all);
    for (const area of feed.areas) {
      const option = document.createElement("option");
      option.value = area.area_id;
      option.textContent = area.geography_name;
      areaSelect.append(option);
    }
    areaId = ALL_AREAS;
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

    // "All neighborhoods": show every business across the whole map at once.
    if (areaId === ALL_AREAS) {
      const tags = availableTagsAll(feed);
      if (areaMeta) areaMeta.textContent = "All neighborhoods · every documented cultural business";
      renderCategories(tags);
      if (sourcesEl) sourcesEl.innerHTML = "";
      if (explainEl) {
        explainEl.textContent =
          "Every culturally relevant licensed business across all mapped neighborhoods. Pick a neighborhood to focus, or filter by category. Verified = certification; Confirmed = advertised category in a strong area; Manually reviewed = editor-approved or lower-confidence.";
      }
      const entries = allDisplayBusinesses(feed, [...selectedTags]);
      if (countEl) countEl.textContent = `${entries.length} business${entries.length === 1 ? "" : "es"} across the city`;
      setStatus(entries.length ? "ready" : "no_results");
      renderList(entries);
      renderMarkers(entries);
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
  if (nameMatchToggle) nameMatchToggle.addEventListener("change", renderNameMatches);
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
