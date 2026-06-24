# NYCIF Open Data Map — Handoff

Current project percentage: 75% complete.

Completed since previous checkpoint:

- Verified `aggregates/311_service_requests/borough/all.json` was still missing.
- Verified recent commits showed no `Refresh generated data` commit and no visible workflow runs through the connector.
- Verified `boundaries/boroughs.geojson` is still development placeholder geometry.
- Added clearly labeled development aggregate JSON at `aggregates/311_service_requests/borough/all.json` so the frontend can be QA'd before live workflow output exists.
- Updated `web/index.html` to show a visible warning when sample data is loaded.
- Updated validation to warn when the aggregate is development sample data.

Current status:

- `web/index.html` can render the MapLibre shell and borough choropleth path.
- Current aggregate is development sample only, not official NYC Open Data counts.
- Current borough geometry is development placeholder only.

Do not publish this map publicly as live data yet.

Still pending:

- Run GitHub Actions or manual refresh to replace the development aggregate with live generated counts.
- Run the boundary fetcher to replace placeholder borough geometry with official NYC geometry.
- QA the map after real data and official geometry are committed.
- Improve map styling, legend scale, popups, mobile behavior, and source/method note.
- Stage WordPress only when the WordPress connector is callable.

Next: replace development aggregate and placeholder boundary geometry with workflow-generated data, then QA the public-facing map.
