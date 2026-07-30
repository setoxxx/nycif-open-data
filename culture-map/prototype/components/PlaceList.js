import { classifyEventLifecycle } from "../services/lifecycle.js";

function experienceSummary(feature) {
  return feature.properties?.title || "Untitled experience";
}

function changedLifecycles(place, now) {
  return place.experiences
    .map((feature) => classifyEventLifecycle(feature, now))
    .filter((lifecycle) => lifecycle.applies && (lifecycle.isChanged || lifecycle.state === "malformed"));
}

export function createPlaceList({ listElement, templateElement, onSelectPlace }) {
  function render(places, selectedPlaceId = null) {
    listElement.replaceChildren();

    if (!places.length) {
      listElement.innerHTML = '<div class="empty-state"><strong>No matching places.</strong><br>Reset or broaden the filters to see the sample records.</div>';
      return;
    }

    const renderNow = new Date();
    places.forEach((place) => {
      const fragment = templateElement.content.cloneNode(true);
      const button = fragment.querySelector(".card-button");
      button.dataset.placeId = place.id;
      button.setAttribute("aria-pressed", String(selectedPlaceId === place.id));
      fragment.querySelector(".card-category").textContent = `${place.experiences.length} experience${place.experiences.length === 1 ? "" : "s"}`;
      fragment.querySelector(".card-title").textContent = place.name;
      fragment.querySelector(".card-meta").textContent = [place.neighborhood, place.borough].filter(Boolean).join(" · ") || "New York City";
      fragment.querySelector(".card-description").textContent = place.experiences
        .map(experienceSummary)
        .join(" • ");

      for (const lifecycle of changedLifecycles(place, renderNow)) {
        const badge = document.createElement("span");
        badge.className = `experience-status lifecycle-${lifecycle.tone}`;
        badge.dataset.lifecycleState = lifecycle.state;
        badge.textContent = lifecycle.label;
        button.append(badge);
      }

      button.addEventListener("click", () => onSelectPlace(place.id));
      listElement.append(fragment);
    });
  }

  function focusPlace(placeId) {
    listElement
      .querySelector(`[data-place-id="${CSS.escape(placeId)}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function showError(message) {
    listElement.innerHTML = `<div class="error-state"><strong>Unable to load the prototype data.</strong><br>${message}</div>`;
  }

  return { render, focusPlace, showError };
}
