# NYCIF Open Data Map — Handoff

Current project percentage: 70% complete.

Completed since previous checkpoint:

- Confirmed the aggregate file is not committed yet.
- Updated the refresh workflow to run on manual dispatch, schedule, and relevant pushes to main.
- Workflow now refreshes borough boundaries before generating the 311 borough aggregate.
- Retried workflow-run inspection; no runs were visible through the current connector.
- Deleted stray `scripts/a.py` test file.
- Added MapLibre choropleth shell to `web/index.html`.
- Added `docs/manual-refresh.md` with exact local commands and GitHub UI steps.

Current expected generated file:

`aggregates/311_service_requests/borough/all.json`

Manual refresh commands:

```bash
python scripts/validate_project.py
python scripts/fetch_boundaries.py --boundary boroughs --out boundaries
python scripts/aggregate.py --dataset 311_service_requests
python scripts/validate_project.py
git add aggregates boundaries catalog
git commit -m "Refresh generated data"
git push origin main
```

Still pending:

- Run or manually trigger the workflow and confirm generated aggregate output.
- Verify the fetched official borough geometry replaces the development placeholder cleanly.
- Commit generated aggregate JSON if GitHub Actions does not do it automatically.
- Improve MapLibre styling and add controls/tooltips after real aggregate data exists.
- Stage WordPress only when the WordPress connector is callable.

Next: produce or confirm `aggregates/311_service_requests/borough/all.json`, then QA the map against real counts and official borough geometry.
