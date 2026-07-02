# NYCIF Open Data Status Artifact v1

## Purpose

Add the first public-safe status artifact for `setoxxx/nycif-open-data`.

This repository is public and is treated as the open-data reference and public dataset catalog lane for NYCIF. This phase adds status metadata only.

## Files added

```text
status/nycif-project-status.json
docs/status-artifact-v1.md
```

## What this PR does

- Adds a static `status/nycif-project-status.json` file.
- Records high-level project status for `nycif-open-data`.
- Includes public-safe blockers, next action, and data freshness notes.
- Includes explicit safety flags for dashboard consumption.

## Safety

This PR does not:

- modify `nycif-field-desk`
- modify private repositories
- expose secrets
- expose private repo internals
- add credentials
- add GitHub tokens
- add browser-side GitHub API polling
- add write controls
- add deploy controls
- change public map runtime
- mutate production feed data
- touch WordPress

## Non-goals

- Does not alter dataset payloads.
- Does not publish or approve feed items.
- Does not add automation.
- Does not add any live GitHub API calls.
- Does not modify the Master Projects dashboard.

## Next phase

After this PR is reviewed and merged, the Master Projects dashboard can be updated in a separate controlled phase to optionally read this static artifact.
