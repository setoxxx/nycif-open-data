# Manual refresh

Use this when GitHub Actions cannot be triggered from the current tool session.

## Local commands

```bash
python scripts/validate_project.py
python scripts/fetch_boundaries.py --boundary boroughs --out boundaries
python scripts/aggregate.py --dataset 311_service_requests
python scripts/validate_project.py
```

Expected generated file:

```text
aggregates/311_service_requests/borough/all.json
```

Commit generated files:

```bash
git add aggregates boundaries catalog
git commit -m "Refresh generated data"
git push origin main
```

## GitHub Actions

The workflow can also be started manually from GitHub:

Actions -> Refresh NYC Open Data aggregates -> Run workflow

The workflow also runs on schedule and on relevant pushes to main.
