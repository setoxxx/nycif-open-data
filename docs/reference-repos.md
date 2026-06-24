# Reference repos reviewed

## joshgreenman1973/nyc-open-data-explorer

Useful for this project's catalog/search layer.

Relevant ideas:

- Full Socrata Discovery API catalog fetch.
- Search-optimized `catalog.min.json` output.
- Agency normalization.
- Freshness labels based on update timestamps.
- Plain-language first-sentence summaries.
- Static frontend deployment pattern.

Adopt selectively. Do not copy UI wholesale; NYC In Focus needs a map-first civic/news product, not only a catalog browser.

## BetaNYC/nyc-record-mcp

Useful for a City Record / public notice lead-finding module.

Relevant ideas:

- City Record dataset id: `dg92-zbpx`.
- Query tools for procurement notices, public hearings, open solicitations, date ranges, agencies, and notice types.
- No required API key for normal public use; Socrata token optional for higher limits.

This is adjacent to the Open Data map MVP. Track as a separate future module for NYC In Focus City Record and public-notice workflows.

## Product decision

Add the explorer repo to the map backlog as a catalog UX reference.
Add the BetaNYC MCP repo to the editorial/public-record backlog, not the map MVP critical path.
