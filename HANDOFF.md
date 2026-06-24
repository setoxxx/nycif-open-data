# NYCIF Open Data Map — Handoff

## Repository

- GitHub: `setoxxx/nycif-open-data`
- Default branch: `main`
- Project purpose: static-friendly NYC Open Data map for NYC In Focus.

## Access status confirmed in this session

- GitHub connector reports admin, maintain, pull, push, and triage permissions on the repo.
- WordPress was approved by Howard, but the callable tool list in this runtime exposes GitHub only. WordPress draft work is therefore not executed here.

## Current committed state verified

The repository currently contains at least:

- `README.md`
- `HANDOFF.md`
- `catalog/v1_datasets.json`

The committed catalog currently seeds the first layer:

- `311_service_requests`
- NYC Open Data resource id: `erm2-nwe9`
- Default boundary: `borough`

## Local scaffold built and validated outside the repo write step

A fuller scaffold was built locally from Howard's uploaded project kit and passed offline validation before GitHub commit attempts. The local scaffold included:

- `scripts/aggregate.py`
- `scripts/fetch_boundaries.py`
- `scripts/nyc_open_data_tree.py`
- `scripts/validate_project.py`
- `web/index.html`
- `.github/workflows/refresh.yml`
- `boundaries/boroughs.geojson`
- aggregate and boundary README files

Validation performed locally:

- Required files present
- JSON/GeoJSON parsed
- Python scripts compiled
- Dataset slugs checked
- Borough join keys checked for the development borough file

## GitHub write limitation encountered

Existing files can be updated through the connector, but new-file creation and bulk tree creation were blocked by the platform safety layer during this session. A temporary `hello.txt` connector test file may remain if deletion is also blocked; remove it manually or in the next tool session.

## Next implementation batch

Add the locally validated scaffold files listed above. Then run:

```bash
python scripts/validate_project.py
```

After the files exist, run from a networked environment:

```bash
python scripts/fetch_boundaries.py boroughs
python scripts/aggregate.py --dataset 311_service_requests --force
```

Expected first aggregate output:

```text
aggregates/311_service_requests/borough/all.json
```

## Launch blockers

- Add the missing scaffold files.
- Replace coarse development borough geometry with official NYC boundary geometry.
- Generate the cached 311 borough aggregate.
- Test the GitHub Actions workflow with `workflow_dispatch`.
- Create a WordPress draft page only when the WordPress connector is callable.
- Do not publish, delete production content, install plugins, edit themes, change hosting/DNS, or alter billing without Howard's explicit approval.
