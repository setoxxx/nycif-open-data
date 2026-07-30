// Culture-mode data service for the City Engine map.
//
// The browser never calls Census or city-data APIs. It reads a precomputed,
// validated Culture feed (contract nycif.culture-feed.v1) produced by the
// nycif-data-pipeline Culture slice, and it refuses to surface any business
// unless the release gate passed and the feed's shape checks out (fail-closed).

export const SUPPORTED_FEED_CONTRACT = "nycif.culture-feed.v1";
export const DISPLAYABLE_DISPOSITIONS = new Set(["ACCEPTED", "REVIEW_REQUIRED"]);
export const DEFAULT_MAX_FEED_AGE_DAYS = 45;

export const TAG_LABELS = {
  caribbean_food: "Caribbean / West Indian food",
  west_indian_grocery: "West Indian grocery",
  caribbean_bakery: "Caribbean bakery",
  caribbean_music: "Caribbean music / venue",
  caribbean_salon: "Afro-Caribbean hair / beauty",
  pakistani_food: "Pakistani food",
  south_asian_grocery: "South Asian grocery",
  pakistani_clothing: "Pakistani / South Asian clothing",
  south_asian_jewelry: "South Asian jewelry",
  south_asian_travel: "South Asian travel / service",
  kosher_food: "Kosher food",
  kosher_grocery: "Kosher grocery",
  judaica: "Judaica",
  halal_food: "Halal food",
  halal_grocery: "Halal grocery",
  chinese_food: "Chinese food",
  chinese_grocery: "Chinese / Asian grocery",
  chinese_bakery: "Chinese bakery",
  korean_food: "Korean food",
  korean_grocery: "Korean grocery",
  greek_food: "Greek food",
  greek_grocery: "Greek / Mediterranean grocery",
  russian_ukrainian_food: "Russian / Ukrainian food",
  russian_grocery: "Russian / Eastern European grocery",
  levantine_arab_food: "Levantine / Arab food",
  arab_grocery: "Middle Eastern / Arab grocery",
  dominican_food: "Dominican food",
  dominican_grocery: "Dominican / Latin grocery",
  guyanese_food: "Guyanese / Indo-Caribbean food",
  italian_food: "Italian food",
  italian_grocery: "Italian salumeria / grocery",
  italian_bakery: "Italian bakery / pasticceria",
  polish_food: "Polish food",
  polish_grocery: "Polish / Eastern European deli",
  filipino_food: "Filipino food",
  filipino_grocery: "Filipino grocery",
  west_african_food: "West African food",
  west_african_grocery: "West African grocery",
  mexican_food: "Mexican food",
  mexican_grocery: "Mexican grocery",
  bangladeshi_food: "Bangladeshi food",
  bangladeshi_grocery: "Bangladeshi grocery",
  sri_lankan_food: "Sri Lankan food",
  thai_food: "Thai food",
  thai_grocery: "Thai / Southeast Asian grocery",
  turkish_food: "Turkish food",
  bukharian_food: "Bukharian / Central Asian food",
  bukharian_grocery: "Bukharian / Central Asian grocery",
  south_asian_food: "South Asian / Indian food",
  albanian_food: "Albanian food",
  ukrainian_food: "Ukrainian food",
  himalayan_food: "Himalayan (Tibetan / Nepali) food",
  indonesian_food: "Indonesian food",
  brazilian_food: "Brazilian food",
  latin_american_food: "Latin American food",
  latin_american_grocery: "Latin American grocery",
  haitian_food: "Haitian food",
  taiwanese_food: "Taiwanese food",
  soul_food: "Soul food",
  irish_food: "Irish food / pub",
};

export function tagLabel(slug) {
  return TAG_LABELS[slug] || slug;
}

// Mirror of the pipeline release-gate contract. Returns the list of failure
// codes (empty === allowed).
export function checkReleaseGate(manifest) {
  if (!manifest || typeof manifest !== "object") return ["MISSING_RELEASE_MANIFEST"];
  const failures = [];
  if (manifest.release_allowed !== true) failures.push("RELEASE_NOT_ALLOWED");
  if (manifest.failure_count !== 0) failures.push("RELEASE_FAILURES_PRESENT");
  return failures;
}

// Client-side structural validation of the feed. This does not re-hash the
// manifest digest (that is the pipeline validator's job) but it does require the
// digest to be present, the contract to be supported, the arrays to exist, the
// accounting to be internally consistent, and the feed to be fresh.
export function validateFeed(feed, { now = Date.now(), maxAgeDays = DEFAULT_MAX_FEED_AGE_DAYS } = {}) {
  const failures = [];
  if (!feed || typeof feed !== "object") return { ok: false, failures: ["UNSUPPORTED_SCHEMA"] };
  if (feed.contract !== SUPPORTED_FEED_CONTRACT) failures.push("UNSUPPORTED_CONTRACT");
  if (!feed.manifest_digest) failures.push("MISSING_MANIFEST_DIGEST");
  if (!Array.isArray(feed.areas) || !Array.isArray(feed.businesses) || !Array.isArray(feed.matches)) {
    failures.push("MALFORMED_FEED");
  }

  const acc = feed.terminal_accounting;
  if (!acc || typeof acc !== "object" || !acc.by_disposition) {
    failures.push("MISSING_ACCOUNTING");
  } else {
    const total = Object.values(acc.by_disposition).reduce((sum, n) => sum + Number(n || 0), 0);
    if (total !== Number(acc.input_business_count)) failures.push("ACCOUNTING_INPUT_MISMATCH");
    if (total !== Number(acc.accounted_business_count)) failures.push("ACCOUNTING_SUM_MISMATCH");
  }

  if (Array.isArray(feed.matches)) {
    for (const m of feed.matches) {
      if (!DISPLAYABLE_DISPOSITIONS.has(m.disposition)) {
        failures.push("NON_DISPLAYABLE_MATCH_IN_FEED");
        break;
      }
    }
  }

  if (feed.generated_at) {
    const ageDays = (now - Date.parse(feed.generated_at)) / 86_400_000;
    if (Number.isFinite(ageDays) && ageDays > maxAgeDays) failures.push("STALE_FEED");
  } else {
    failures.push("MISSING_GENERATED_AT");
  }

  return { ok: failures.length === 0, failures };
}

export function areaById(feed, areaId) {
  return (feed.areas || []).find((a) => a.area_id === areaId) || null;
}

export function businessById(feed, businessId) {
  return (feed.businesses || []).find((b) => b.business_id === businessId) || null;
}

export function matchesForArea(feed, areaId) {
  return (feed.matches || []).filter((m) => m.area_id === areaId);
}

export function availableTagsForArea(feed, areaId) {
  const tags = new Set();
  for (const m of matchesForArea(feed, areaId)) {
    if (m.matched_tag) tags.add(m.matched_tag);
  }
  return [...tags].sort();
}

// Deterministic: the best (highest-scoring) displayable match for a business in
// an area, used to explain "why included".
export function bestMatch(feed, areaId, businessId) {
  const list = matchesForArea(feed, areaId)
    .filter((m) => m.business_id === businessId)
    .sort((a, b) => b.relevance_score - a.relevance_score || a.match_id.localeCompare(b.match_id));
  return list[0] || null;
}

// Businesses culturally relevant to an area, optionally narrowed to selected
// cultural tags. Returns unique business records with their best match attached.
export function businessesForArea(feed, areaId, selectedTags = []) {
  const selected = new Set(selectedTags);
  const wanted = matchesForArea(feed, areaId).filter(
    (m) => selected.size === 0 || selected.has(m.matched_tag),
  );
  const seen = new Map();
  for (const m of wanted) {
    if (!seen.has(m.business_id)) {
      const business = businessById(feed, m.business_id);
      if (business) seen.set(m.business_id, business);
    }
  }
  return [...seen.values()].map((business) => ({
    business,
    match: bestMatch(feed, areaId, business.business_id),
  }));
}

export function reasonPhrase(code) {
  return (
    {
      ACCEPTED_DIRECT_CATEGORY_MATCH: "Verified by advertised category/cuisine in a strong cultural area",
      ACCEPTED_VERIFIED_CERTIFICATION: "Verified by third-party certification on file",
      ACCEPTED_REVIEWED_CULTURAL_TAG: "Confirmed by manual NYCIF cultural review",
      REVIEW_AMBIGUOUS_BUSINESS_DESCRIPTION: "Flagged for review — ambiguous business description",
      REVIEW_LOW_CONFIDENCE_AREA_MATCH: "Flagged for review — lower-confidence area match",
    }[code] || code
  );
}

// Load and validate the feed. `fetchImpl` is injectable for tests.
export async function loadCultureFeed({
  releaseUrl,
  feedUrl,
  fetchImpl = fetch,
  now = Date.now(),
  maxAgeDays = DEFAULT_MAX_FEED_AGE_DAYS,
} = {}) {
  const release = await fetchJson(fetchImpl, releaseUrl);
  const gate = checkReleaseGate(release);
  if (gate.length) {
    const err = new Error("Culture release gate closed");
    err.kind = "validation_failure";
    err.failures = gate;
    throw err;
  }
  const feed = await fetchJson(fetchImpl, feedUrl);
  const verdict = validateFeed(feed, { now, maxAgeDays });
  if (!verdict.ok) {
    const err = new Error("Culture feed failed validation");
    err.kind = verdict.failures.includes("STALE_FEED") ? "stale" : "validation_failure";
    err.failures = verdict.failures;
    throw err;
  }
  return feed;
}

async function fetchJson(fetchImpl, url) {
  const response = await fetchImpl(url, { cache: "no-store" });
  if (!response.ok) {
    const err = new Error(`Could not load ${url}`);
    err.kind = "network_failure";
    throw err;
  }
  return response.json();
}
