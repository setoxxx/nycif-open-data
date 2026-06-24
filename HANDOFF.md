# NYCIF Open Data Map — Handoff

Current project percentage: 82% complete.

Completed since previous checkpoint:

- Verified current repo state from the 80% checkpoint.
- Confirmed `aggregates/311_service_requests/borough/all.json` is still development sample data, not live generated NYC Open Data output.
- Confirmed `boundaries/boroughs.geojson` is still development placeholder geometry.
- Added strict refresh mode to `scripts/validate_project.py`:
  - normal validation still permits QA scaffolding with warnings
  - `--strict-refresh` fails if placeholder geometry remains
  - `--strict-refresh` fails if the aggregate is missing or still marked development sample
- Updated `.github/workflows/refresh.yml` so the post-refresh validation step runs `python scripts/validate_project.py --strict-refresh`.
- Re-checked workflow visibility after the workflow commit; no workflow runs were visible through the connector.
- Re-checked `web/index.html`; it remains consistent with the current launch blockers and shows visible QA warnings.

Current status:

- The repo is safer: a refresh run should not quietly pass if QA files remain.
- The frontend remains QA-only until generated files replace the sample/placeholder files.
- No live-data readiness claim should be made yet.

Still pending:

- Manually trigger GitHub Actions or run local refresh commands.
- Commit generated `boundaries/boroughs.geojson` with non-placeholder metadata.
- Commit generated `aggregates/311_service_requests/borough/all.json` with real counts, not development sample data.
- QA borough join IDs, count scale, colors, popups, and mobile layout after real generated files exist.
- Stage WordPress only when the WordPress connector is callable.

Next: run the refresh and commit real generated files, then perform live-data QA.
