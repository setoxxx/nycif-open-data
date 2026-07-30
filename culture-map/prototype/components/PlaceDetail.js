import { eventId } from "../services/data.js";
import { classifyEventLifecycle } from "../services/lifecycle.js";
import { formatDateTime } from "../services/time.js";

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeLink(url, label) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    return `<a href="${escapeHtml(parsed.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
  } catch {
    return "";
  }
}

function jobTypeLabel(value = "") {
  return String(value)
    .split("-")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function choiceStatus(lifecycle) {
  if (!lifecycle.applies || (!lifecycle.isChanged && lifecycle.state !== "malformed")) return "";
  return `<span class="experience-status lifecycle-${escapeHtml(lifecycle.tone)}" data-lifecycle-state="${escapeHtml(lifecycle.state)}">${escapeHtml(lifecycle.label)}</span>`;
}

function lifecycleHeading(lifecycle) {
  if (!lifecycle.applies) return "";
  return `<div class="lifecycle-heading"><span class="lifecycle-badge lifecycle-${escapeHtml(lifecycle.tone)}" data-lifecycle-state="${escapeHtml(lifecycle.state)}">${escapeHtml(lifecycle.label)}</span></div>`;
}

function statusFacts(properties, lifecycle) {
  if (lifecycle.applies) {
    return `<dt>Status</dt><dd>${escapeHtml(lifecycle.label)}</dd><dt>Source status</dt><dd>${escapeHtml(lifecycle.sourceStatus)}</dd>`;
  }

  const status = properties.editorial_status || properties.status || "Not specified";
  return `<dt>Status</dt><dd>${escapeHtml(status)}</dd>`;
}

export function createPlaceDetail({ element, onSelectExperience }) {
  function render(place, selectedExperienceId = null) {
    if (!place) {
      element.innerHTML = '<div class="empty-detail"><h2 id="detail-heading">Select a place</h2><p>Choose a marker or place card to see its connected experiences.</p></div>';
      return;
    }

    const renderNow = new Date();
    const selected = place.experiences.find((feature) => eventId(feature) === selectedExperienceId) || place.experiences[0];
    const properties = selected?.properties || {};
    const lifecycle = classifyEventLifecycle(selected, renderNow);
    const links = [
      safeLink(properties.registration_url, "Register or apply"),
      safeLink(properties.official_source_url || properties.source_url || properties.canonical_url, "Official source"),
      safeLink(properties.nycif_url, "NYC In Focus page"),
    ].filter(Boolean).join("");

    const experienceButtons = place.experiences.map((feature) => {
      const id = eventId(feature);
      const item = feature.properties || {};
      const itemLifecycle = classifyEventLifecycle(feature, renderNow);
      return `<button class="experience-choice" type="button" data-experience-id="${escapeHtml(id)}" aria-pressed="${String(id === eventId(selected))}"><span>${escapeHtml(item.category || "Experience")}</span><strong>${escapeHtml(item.title || "Untitled experience")}</strong>${choiceStatus(itemLifecycle)}<small>${escapeHtml(formatDateTime(feature))}</small></button>`;
    }).join("");

    const jobsFacts = properties.category === "Jobs"
      ? `<dt>Event type</dt><dd>${escapeHtml(jobTypeLabel(properties.job_event_type) || "Workforce event")}</dd><dt>Organizer</dt><dd>${escapeHtml(properties.organizer || "New York State Department of Labor")}</dd>`
      : "";

    const lifecycleNotice = lifecycle.applies && lifecycle.notice
      ? `<p class="lifecycle-notice lifecycle-${escapeHtml(lifecycle.tone)}" role="status">${escapeHtml(lifecycle.notice)}</p>`
      : "";

    element.innerHTML = `
      <div class="place-detail-header">
        <p class="detail-kicker">Place</p>
        <h2 id="detail-heading">${escapeHtml(place.name)}</h2>
        <p>${escapeHtml(place.address || [place.neighborhood, place.borough].filter(Boolean).join(", ") || "Location details unavailable")}</p>
      </div>
      <div class="place-detail-layout">
        <div class="experience-choices" aria-label="Experiences at this place">${experienceButtons}</div>
        <div class="detail-grid">
          <div>
            <p class="detail-kicker">${escapeHtml(properties.category || "Experience")}</p>
            <h3>${escapeHtml(properties.title || "Untitled experience")}</h3>
            ${lifecycleHeading(lifecycle)}
            ${lifecycleNotice}
            <p class="detail-description">${escapeHtml(properties.description || "No description available.")}</p>
            ${links ? `<div class="detail-links">${links}</div>` : ""}
          </div>
          <dl class="detail-facts">
            <dt>When</dt><dd>${escapeHtml(formatDateTime(selected))}</dd>
            <dt>Borough</dt><dd>${escapeHtml(properties.borough || place.borough || "Not specified")}</dd>
            ${jobsFacts}
            <dt>Cost</dt><dd>${escapeHtml(properties.cost || "Not specified")}</dd>
            ${statusFacts(properties, lifecycle)}
            <dt>Source</dt><dd>${escapeHtml(properties.source_name || properties.publisher_name || "Not specified")}</dd>
          </dl>
        </div>
      </div>`;

    element.querySelectorAll("[data-experience-id]").forEach((button) => {
      button.addEventListener("click", () => onSelectExperience(button.dataset.experienceId));
    });
  }

  return { render };
}
