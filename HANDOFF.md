# NYCIF Open Data Map — Handoff

Current project percentage: 80% complete.

Completed since previous checkpoint:

- Verified the repo is still at the QA-data stage.
- Verified `aggregates/311_service_requests/borough/all.json` is still development sample data, not live generated NYC Open Data output.
- Verified `boundaries/boroughs.geojson` is still development placeholder geometry.
- Improved `scripts/fetch_boundaries.py` so generated boundary output now includes:
  - `metadata.status: generated_from_source`
  - source URL and source dataset id
  - normalized `id` / `join_key` properties
  - feature count metadata
  - strict borough join-id validation for `MN`, `BX`, `BK`, `QN`, and `SI`
- Checked workflow visibility after the boundary-script commit; no workflow runs were visible through the connector.
- Attempted to update `docs/manual-refresh.md` with stronger checks, but the connector blocked the doc update.

Current status:

- Boundary fetch script is stronger and should replace the placeholder when run in a networked environment.
- Validator warns when placeholder geometry or development aggregate data are present.
- `web/index.html` remains guarded with visible QA warnings.
- The map is still blocked from public live-data launch until generated aggregate data and official borough geometry are committed.

Still pending:

- Run GitHub Actions manually or run local refresh commands.
- Commit generated `boundaries/boroughs.geojson` with `metadata.status: generated_from_source`.
- Commit generated `aggregates/311_service_requests/borough/all.json` with real counts, not development sample data.
- QA map joins, colors, popups, and mobile behavior against real generated files.
- Stage WordPress only when the WordPress connector is callable.

Next: produce real generated files, then perform live-data QA and remove launch blockers.
