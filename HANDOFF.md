# NYCIF Open Data Map — Handoff

Current project percentage: 88% complete.

Completed since previous checkpoint:

- Verified current repo state from the 88% checkpoint.
- Confirmed `aggregates/311_service_requests/borough/all.json` remains development sample data.
- Confirmed `boundaries/boroughs.geojson` remains development placeholder geometry.
- Did not claim live-data readiness.
- Confirmed the latest validator/handoff commit had no visible workflow run or status check through the connector.
- Reviewed Howard's local terminal output: refresh commands were run from the home directory, not the repository root, and the local shell did not have `python` mapped.
- Updated the local-run instruction: use the cloned repo directory and `python3`.

Current status:

- The repo is safer for a real refresh run.
- The frontend remains QA-only until generated files replace the sample/placeholder files.
- No live-data readiness claim should be made yet.
- The next meaningful progress point is generated data.

Still pending:

- Run the refresh commands from the cloned repository root using `python3`.
- Commit generated `boundaries/boroughs.geojson` with non-placeholder metadata.
- Commit generated `aggregates/311_service_requests/borough/all.json` with real counts, not development sample data.
- QA borough join IDs, count scale, colors, popups, mobile layout, and warning removal after real generated files exist.
- Stage WordPress only when the WordPress connector is callable.

Next: run the refresh from the repo root with `python3`, commit real generated files, then perform live-data QA.
