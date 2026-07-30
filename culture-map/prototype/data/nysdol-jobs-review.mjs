export const JOBS_REVIEW_HORIZON_DAYS = 7;
export const JOBS_SYNC_LOCAL_TIME = "03:00";
export const JOBS_SYNC_TIME_ZONE = "America/New_York";

const INACTIVE_STATUSES = new Set(["cancelled", "postponed", "expired"]);

function nycDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError("Review package requires a valid date.");
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: JOBS_SYNC_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date).filter(({ type }) => type !== "literal").map(({ type, value: part }) => [type, part]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function shiftDateKey(key, days) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function createJobsReviewWindow(now = new Date(), days = JOBS_REVIEW_HORIZON_DAYS) {
  const horizonDays = Math.max(1, Math.floor(Number(days) || JOBS_REVIEW_HORIZON_DAYS));
  const startDate = nycDateKey(now);
  return Object.freeze({
    startDate,
    endDateExclusive: shiftDateKey(startDate, horizonDays),
    days: horizonDays,
    timeZone: JOBS_SYNC_TIME_ZONE,
  });
}

function isWithinWindow(record, window) {
  const startDate = record?.properties?.start_date;
  return typeof startDate === "string" && startDate >= window.startDate && startDate < window.endDateExclusive;
}

function isActiveCandidate(feature) {
  const properties = feature?.properties || {};
  return properties.public_display_eligible === true && !INACTIVE_STATUSES.has(properties.status);
}

function countBy(items, accessor) {
  const counts = {};
  for (const item of items) {
    const key = String(accessor(item) || "unspecified");
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

export function createNysdolJobsReviewPackage(syncResult, options = {}) {
  if (!syncResult || typeof syncResult !== "object") throw new TypeError("Review package requires a sync result.");
  const now = options.now instanceof Date ? options.now : new Date(options.now ?? Date.now());
  const window = createJobsReviewWindow(now, options.days);
  const features = Array.isArray(syncResult.features) ? syncResult.features : [];
  const inWindow = features.filter((feature) => isWithinWindow(feature, window));
  const activeCandidates = inWindow.filter(isActiveCandidate);
  const statusReview = inWindow.filter((feature) => !isActiveCandidate(feature));
  const unmapped = (Array.isArray(syncResult.unmapped) ? syncResult.unmapped : [])
    .filter((entry) => isWithinWindow({ properties: entry.properties }, window));
  const rejected = Array.isArray(syncResult.rejected) ? syncResult.rejected : [];
  const readyForReview = rejected.length === 0;
  const generatedAt = now.toISOString();
  const candidateFeatures = readyForReview ? activeCandidates : [];

  const report = Object.freeze({
    status: readyForReview ? "ready-for-human-review" : "blocked-normalization-errors",
    publication_authorized: false,
    approval_status: "pending",
    generated_at: generatedAt,
    scheduled_local_time: JOBS_SYNC_LOCAL_TIME,
    scheduled_time_zone: JOBS_SYNC_TIME_ZONE,
    review_window: window,
    source_feed_url: options.feedUrl || syncResult.source?.feedUrl || "",
    input_count: syncResult.source?.inputCount ?? null,
    mapped_in_window_count: inWindow.length,
    candidate_count: candidateFeatures.length,
    blocked_candidate_count: readyForReview ? 0 : activeCandidates.length,
    status_review_count: statusReview.length,
    unmapped_review_count: unmapped.length,
    duplicate_count: syncResult.duplicates?.length ?? 0,
    ignored_count: syncResult.ignored?.length ?? 0,
    rejected_count: rejected.length,
    out_of_window_count: features.length - inWindow.length,
    candidates_by_borough: countBy(candidateFeatures, (feature) => feature.properties?.borough),
    candidates_by_type: countBy(candidateFeatures, (feature) => feature.properties?.job_event_type),
  });

  const candidateCollection = Object.freeze({
    type: "FeatureCollection",
    name: "NYCIF NYSDOL Jobs seven-day review candidates",
    metadata: {
      generated_at: generatedAt,
      review_window_start: window.startDate,
      review_window_end_exclusive: window.endDateExclusive,
      review_horizon_days: window.days,
      approval_status: "pending",
      publication_authorized: false,
      source_url: options.feedUrl || syncResult.source?.feedUrl || "",
    },
    features: candidateFeatures,
  });

  const summaryMarkdown = [
    "# NYSDOL Jobs daily review",
    "",
    `- Scheduled sync: ${JOBS_SYNC_LOCAL_TIME} ${JOBS_SYNC_TIME_ZONE}`,
    `- Review window: ${window.startDate} through ${shiftDateKey(window.endDateExclusive, -1)} (${window.days} days)`,
    `- Active mapped candidates: ${report.candidate_count}`,
    `- Status review: ${report.status_review_count}`,
    `- Unmapped review: ${report.unmapped_review_count}`,
    `- Duplicates suppressed: ${report.duplicate_count}`,
    `- Rejected records: ${report.rejected_count}`,
    "- Publication authorized: no — human review is required",
    "",
  ].join("\n");

  return Object.freeze({
    candidateCollection,
    statusReview,
    unmappedReview: unmapped,
    rejectedReview: rejected,
    duplicates: syncResult.duplicates ?? [],
    ignored: syncResult.ignored ?? [],
    report,
    summaryMarkdown,
  });
}
