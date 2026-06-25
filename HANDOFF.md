# NYCIF Open Data Map — Handoff

Current project percentage: 87% complete.

Completed since previous checkpoint:

- Verified current repo state from the 87% checkpoint.
- Confirmed `aggregates/311_service_requests/borough/all.json` remains development sample data.
- Confirmed `boundaries/boroughs.geojson` remains development placeholder geometry.
- Did not claim live-data readiness.
- Checked connector-visible commit evidence for the latest handoff commit; no statuses or workflow runs were visible.
- Confirmed `.github/workflows/refresh.yml` still has manual and scheduled refresh, strict post-refresh validation, generated-file commit steps, timeout, concurrency, and bot-push guard.
- No sample-data UI polishing was performed.

Current status:

- The repo remains safer for a real refresh run than the original scaffold.
- The frontend remains QA-only until generated files replace the sample/placeholder files.
- No live-data readiness claim should be made yet.
- The next meaningful progress point is generated data.

Still pending:

- Manually trigger GitHub Actions or run local refresh commands.
- Commit generated `boundaries/boroughs.geojson` with non-placeholder metadata.
- Commit generated `aggregates/311_service_requests/borough/all.json` with real counts, not development sample data.
- QA borough join IDs, count scale, colors, popups, mobile layout, and warning removal after real generated files exist.
- Stage WordPress only when the WordPress connector is callable.

Next: run the refresh and commit real generated files, then perform live-data QA.
