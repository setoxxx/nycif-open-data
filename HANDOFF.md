# NYCIF Open Data Map — Handoff

Current project percentage: 78% complete.

Completed since previous checkpoint:

- Verified the aggregate is still development sample data, not live generated NYC Open Data output.
- Verified the borough file is still development placeholder geometry.
- Improved `web/index.html` launch-safety behavior:
  - separate warning for development sample aggregate data
  - separate warning for placeholder borough geometry
  - visible source/method note
  - mobile-height adjustment
  - MapLibre navigation control
  - status text that says QA data has launch blockers when either blocker is present
- Updated `scripts/validate_project.py` to warn when borough geometry is still the development placeholder.
- Kept the existing validation warning for development sample aggregate data.

Current status:

- `web/index.html` can render the MapLibre map path with QA data.
- Current aggregate is development sample only.
- Current borough geometry is development placeholder only.
- The map remains blocked from public live-data launch until generated aggregate data and official borough geometry are committed.

Still pending:

- Run GitHub Actions or manual refresh to replace `aggregates/311_service_requests/borough/all.json` with live generated counts.
- Run the boundary fetcher to replace `boundaries/boroughs.geojson` with official NYC geometry.
- QA popups, count scale, borough joins, and mobile behavior after real files exist.
- Improve public source/method copy after live data is confirmed.
- Stage WordPress only when the WordPress connector is callable.

Next: replace the two QA blockers — development aggregate and placeholder geometry — with generated files, then perform real-data map QA.
