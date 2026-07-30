const SEARCH_FIELDS = [
  ["title", 12],
  ["neighborhood", 9],
  ["category", 8],
  ["borough", 7],
  ["address", 5],
  ["description", 2],
];

const TERM_ALIASES = new Map([
  ["bk", ["brooklyn"]],
  ["bkn", ["brooklyn"]],
  ["bx", ["bronx"]],
  ["si", ["staten island"]],
  ["arts", ["art", "culture"]],
  ["art", ["arts", "culture"]],
  ["kids", ["family"]],
  ["kid", ["family"]],
  ["children", ["family"]],
  ["fair", ["festival"]],
  ["festival", ["fair"]],
  ["march", ["parade", "procession"]],
  ["parade", ["march", "procession"]],
  ["park", ["parks", "outdoors"]],
  ["outdoor", ["outdoors", "parks"]],
  ["photo", ["photography", "opportunity"]],
  ["sports", ["sport"]],
  ["meeting", ["civic", "public"]],
  ["transit", ["transportation", "street", "closure"]],
]);

export function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function tokenizeSearchQuery(query) {
  return [...new Set(normalizeSearchText(query).split(" ").filter(Boolean))];
}

function candidatesForTerm(term) {
  return [term, ...(TERM_ALIASES.get(term) ?? [])];
}

function fieldContainsCandidate(fieldText, candidate) {
  if (!fieldText || !candidate) return false;
  if (candidate.includes(" ")) return fieldText.includes(candidate);

  const words = fieldText.split(" ");
  return words.some((word) =>
    word === candidate ||
    (candidate.length >= 3 && word.startsWith(candidate)),
  );
}

function searchableFields(feature) {
  const properties = feature?.properties ?? {};
  return SEARCH_FIELDS.map(([field, weight]) => ({
    field,
    weight,
    text: normalizeSearchText(properties[field]),
  }));
}

export function scoreSearchMatch(feature, query) {
  const normalizedQuery = normalizeSearchText(query);
  const terms = tokenizeSearchQuery(normalizedQuery);
  if (!terms.length) return 0;

  const fields = searchableFields(feature);
  let score = 0;

  for (const term of terms) {
    const candidates = candidatesForTerm(term);
    let bestFieldScore = 0;

    for (const { text, weight } of fields) {
      if (candidates.some((candidate) => fieldContainsCandidate(text, candidate))) {
        bestFieldScore = Math.max(bestFieldScore, weight);
      }
    }

    if (!bestFieldScore) return 0;
    score += bestFieldScore;
  }

  for (const { text, weight } of fields) {
    if (normalizedQuery.length > 2 && text.includes(normalizedQuery)) {
      score += weight;
    }
  }

  return score;
}

export function rankFeaturesBySearch(features = [], query = "") {
  if (!tokenizeSearchQuery(query).length) return [...features];

  return features
    .map((feature, index) => ({ feature, index, score: scoreSearchMatch(feature, query) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ feature }) => feature);
}
