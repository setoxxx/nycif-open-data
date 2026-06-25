# NYCIF Open Data Map — Handoff

Current project percentage: 87% complete.

Completed since previous checkpoint:

- Verified current repo state from the 86% checkpoint.
- Confirmed `aggregates/311_service_requests/borough/all.json` remains development sample data.
- Confirmed `boundaries/boroughs.geojson` remains development placeholder geometry.
- Did not claim live-data readiness.
- Confirmed no `Refresh generated data` commit was visible through the connector.
- Checked workflow evidence for the latest workflow commit; no visible workflow run was available through the connector.
- Improved `.github/workflows/refresh.yml` reliability with a job-level bot-push guard so generated-data bot pushes do not re-enter the refresh job.
- Re-checked `scripts/validate_project.py`; validation remains aligned with current launch blockers and map input consistency checks.

Current status:

- The repo is safer for a real refresh run.
- The frontend remains QA-only until generated files replace the sample/placeholder files.
- No more sample-data UI polishing is recommended unless it fixes a concrete launch-safety issue.
- The next meaningful progress point is generated data.

Still pending:

- Manually trigger GitHub Actions or run local refresh commands.
- Commit generated `boundaries/boroughs.geojson` with non-placeholder metadata.
- Commit generated `aggregates/311_service_requests/borough/all.json` with real counts, not development sample data.
- QA borough join IDs, count scale, colors, popups, mobile layout, and warning removal after real generated files exist.
- Stage WordPress only when the WordPress connector is callable.

Next: run the refresh and commit real generated files, then perform live-data QA.
