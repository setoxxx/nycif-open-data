# NYCIF Open Data Map — Handoff

Current project percentage: 88% complete.

Completed since previous checkpoint:

- Verified current repo state from the 87% checkpoint.
- Confirmed `aggregates/311_service_requests/borough/all.json` remains development sample data.
- Confirmed `boundaries/boroughs.geojson` remains development placeholder geometry.
- Did not claim live-data readiness.
- Confirmed the local runtime could not reach NYC Open Data directly, so generated files were not safely created in this pass.
- Confirmed raw query URLs were not directly openable through the web tool, so generated files were not synthesized from partial data.
- Improved `scripts/validate_project.py` strict launch validation:
  - borough geometry must report generated-from-source status
  - borough geometry must include source URL and source dataset metadata
  - borough feature_count metadata must match the actual feature length
  - aggregate output must include generated_at, source_query, and dataset_id in strict mode
- Checked commit evidence for the validator update; no visible workflow run or status check was available through the connector.

Current status:

- The repo is safer for a real refresh run.
- The frontend remains QA-only until generated files replace the sample/placeholder files.
- No live-data readiness claim should be made yet.
- The next meaningful progress point is generated data.

Still pending:

- Manually trigger GitHub Actions or run local refresh commands in an environment that can reach NYC Open Data.
- Commit generated `boundaries/boroughs.geojson` with non-placeholder metadata.
- Commit generated `aggregates/311_service_requests/borough/all.json` with real counts, not development sample data.
- QA borough join IDs, count scale, colors, popups, mobile layout, and warning removal after real generated files exist.
- Stage WordPress only when the WordPress connector is callable.

Next: run the refresh in an environment that can reach NYC Open Data, commit real generated files, then perform live-data QA.
