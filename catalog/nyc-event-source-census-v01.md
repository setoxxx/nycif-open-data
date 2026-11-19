# NYC Event Source Census v01

Verified through: 2026-08-10 (America/New_York)

Purpose: provide BORG/Open Data with a dated, auditable NYC source baseline for discovery and qualification. This document is a catalog and work queue. It does **not** activate a production source, publish an event, authorize an exact map pin, or create a second event authority.

Canonical path remains:

`discovery -> reviewed source contract -> nycif-live-feeds/BORG -> OccurrenceIdentity -> temporal/status quality -> VenueIdentity/location evidence -> Projector V3 -> reader-safe artifact -> National Map`

## Dispositions

- `ACTIVE_CANONICAL`: already represented in the current NYCIF production/source authority line.
- `QUALIFY_NOW`: current high-value first-party source; build/inspect adapter and source contract next.
- `DISCOVERY_ONLY`: useful for finding public events/organizers/venues, but not direct publication authority.
- `VENUE_LEAD`: first-party venue calendar that should seed VenueIdentity and organizer/venue graph discovery.
- `REFERENCE_ONLY`: useful technical/catalog reference; not a production source.
- `EXCLUDE_PRIVATE`: member-only/student-only/invite-only/private/hidden-location event data must not enter the public reader surface.

## A. Existing citywide authority backbone

| Source | Sector | Disposition | Current evidence / integration note |
|---|---|---|---|
| NYC Permitted Event Information (`tvpp-9vvx`) | government / permitted events | ACTIVE_CANONICAL | Existing NYCIF authoritative adapter/source family; retain status/cancellation and route/area semantics. |
| NYC Parks upcoming events (`w3wp-dpdi`) | parks / recreation | ACTIVE_CANONICAL | Existing NYCIF current Parks authority; current source contract uses official upcoming-events Open Data. |
| NYC Citywide Events Calendar (`api.nyc.gov/calendar/*`) | government / agency programs | ACTIVE_CANONICAL | Existing NYCIF adapter; current script resolves event ID/GUID/sequence, cancellation, dates, boroughs, categories, agency and address fields. |

## B. Public libraries and community programming

| Source | Sector | Disposition | Why it matters / qualification work |
|---|---|---|---|
| New York Public Library Events Calendar (`nypl.org/events/calendar`) | library/community | QUALIFY_NOW | Very large current calendar across Manhattan, Bronx and Staten Island; public classes, talks, book clubs, crafts, films, youth/adult programs. Discover machine-readable endpoint/structured data and stable event/location IDs. |
| Brooklyn Public Library calendar / BPL Presents (`bklynlibrary.org`) | library/community | QUALIFY_NOW | Current 2026 public programs with event pages, dates, times, branch/venue, address and calendar export. Build stable event/branch identity; include off-site partner venues as VenueIdentity leads. |
| Queens Public Library Calendar (`queenslibrary.org/calendar`) | library/community | QUALIFY_NOW | Current calendar with date/time, branch, audience and program type. Determine stable event ID/export/API and branch identity. |
| DYCD / DiscoverDYCD program locator and public programming | community/youth | QUALIFY_NOW | Treat as program/facility discovery. Only time-bounded publicly attendable sessions become event candidates. Do not turn static service/facility listings into events. |
| NYC community centers / recreation centers found via repeated venue evidence | community | VENUE_LEAD | BORG follows repeated public events to official center calendars and program pages. Venue repetition is an investigation trigger, not publication truth. |

## C. Colleges and universities

| Source | Sector | Disposition | Why it matters / qualification work |
|---|---|---|---|
| CUNY Events Calendar (`events.cuny.edu`) | college/university | QUALIFY_NOW | Current centralized calendar spans many NYC colleges and categories including performing arts, lectures, conferences, exhibits, sports, alumni, student events, special events and open houses. Must filter public-access eligibility; student-only/internal events are excluded. |
| NYU Events Calendar (`events.nyu.edu`) | college/university | QUALIFY_NOW | Current 2026 calendar includes academic and NYU Engage events. Determine public-access field/visibility and stable event/venue IDs before promotion. |
| Columbia University public events calendar | college/university | QUALIFY_NOW | First-party institutional event family. Qualify current endpoint/feed and public eligibility; follow repeated campus venues to department and center calendars. |
| Cornell Tech / Cornell NYC public events (`events.cornell.edu` plus NYC units) | college/university | QUALIFY_NOW | Localist-family source with structured event/place relationships and public/open-to-public indicators on event pages; restrict to NYC locations. |
| Fordham and other NYC university public calendars | college/university | QUALIFY_NOW | Add institution-by-institution through common platform adapters (Localist, Modern Campus, CampusGroups, ICS, JSON-LD) where available. |
| Student-club calendars | college/student organization | DISCOVERY_ONLY | Publicly announced club events may qualify; repeated venues seed VenueIdentity investigation. Never ingest student/member rosters, login-only events, private club meetings, or RSVP identities. |

## D. Cultural institutions and major venues

| Source | Sector | Disposition | Why it matters / qualification work |
|---|---|---|---|
| Lincoln Center calendar | culture/performance | QUALIFY_NOW | Current 2026 calendar exposes date/time, venue, indoor/outdoor, event type and accessibility attributes; large summer/public program inventory. |
| Metropolitan Museum of Art event calendar | museum/culture | QUALIFY_NOW | First-party museum programs; qualify stable event/venue/date fields and public/ticketed access. |
| Museum of Modern Art calendar | museum/culture | QUALIFY_NOW | First-party events/programming; qualify structured data/API/export and status. |
| Carnegie Hall calendar | performance | QUALIFY_NOW | First-party scheduled performance source; preserve ticketed/public access and venue/hall identity. |
| 92NY event calendar | culture/community | QUALIFY_NOW | Talks, classes, performances and public programs; qualify stable identifiers and access type. |
| Madison Square Garden event calendar | arena/sports/entertainment | VENUE_LEAD | First-party venue calendar; useful for concerts, sports and arena events not represented in street permits. |
| Barclays Center event calendar | arena/sports/entertainment | VENUE_LEAD | First-party Brooklyn arena calendar; qualify canonical event IDs and avoid duplicates with league schedules/promoters. |
| Broadway / performing-arts venue calendars | theater/culture | VENUE_LEAD | Venue/producer first-party pages are preferred over ticket aggregators. Use show occurrence identity and performance times carefully. |
| Museums, galleries, cultural centers found from events | culture | VENUE_LEAD | Repeated events at one place trigger official-calendar investigation and VenueIdentity enrichment. |

## E. Sports

| Source | Sector | Disposition | Why it matters / qualification work |
|---|---|---|---|
| New York Yankees official schedule | sports | QUALIFY_NOW | First-party league/team schedule. Map home games only to Yankee Stadium; dedupe against venue calendars. |
| New York Mets official schedule | sports | QUALIFY_NOW | First-party league/team schedule. Map home games only to Citi Field; dedupe against venue calendars. |
| Knicks / Rangers official schedules | sports | QUALIFY_NOW | First-party league/team schedule; home occurrences at Madison Square Garden. |
| Nets / Liberty official schedules | sports | QUALIFY_NOW | First-party league/team schedule; preserve current home venue per season and dedupe against arena calendar. |
| NYCFC / Red Bulls / Gotham FC and other metro-area schedules | sports | QUALIFY_NOW | Only events physically in NYC enter NYC map scope; regional/out-of-city venues stay outside NYC scope unless product boundary explicitly expands. |
| road races / leagues / tournaments | sports/recreation | DISCOVERY_ONLY | Use official organizer/permit/parks data. Route events must not be reduced to an unjustified exact point. |

## F. Civic, hearings, public meetings and politics

| Source | Sector | Disposition | Why it matters / qualification work |
|---|---|---|---|
| NYC Council meetings/hearings calendar | civic/government | QUALIFY_NOW | Public hearings, committee meetings and stated meetings. Need meeting ID, date/time, location/remote status, committee and cancellation/update handling. |
| NYC Community Board calendars | civic/neighborhood | QUALIFY_NOW | District-level public meetings are important neighborhood activity. Build board/district source registry and standard adapters; do not infer a meeting from static board pages. |
| NYC agency public hearings/meetings | civic/government | QUALIFY_NOW | Discover from agency calendars/notices; official hearing notice is strong evidence but location/virtual state must be normalized. |
| NYC Votes / Campaign Finance Board public civic events | civic/elections | QUALIFY_NOW | Voter education and public civic programming; do not expose voter/supporter information. |
| NYC Board of Elections calendar/notices | elections | QUALIFY_NOW | Election-related public dates and hearings where time-bounded and publicly attendable; election deadlines are not automatically map events. |
| Mobilize public NYC event pages | political/civic/advocacy | DISCOVERY_ONLY | Strong discovery surface for public voter-registration, canvass, volunteer and advocacy events. Keep organizer and public event data only; never collect attendee/supporter data. |
| Action Network public event pages | political/civic/advocacy | DISCOVERY_ONLY | Use public event metadata as leads/corroboration; API-key collections are organization-scoped. Public/private visibility must be respected. |
| Official Democratic, Republican, Green, Libertarian, independent and nonpartisan club calendars | political club | QUALIFY_NOW | Neutral eligibility rules across viewpoints. Publicly announced meetings/forums/town halls may qualify; member-only/invite-only events do not. |
| League of Women Voters NYC and other nonpartisan civic organizations | civic | QUALIFY_NOW | Public voter education/registration activities can qualify from first-party pages or verified platform pages. |

## G. Social clubs, hobby groups and associations

| Source | Sector | Disposition | Why it matters / qualification work |
|---|---|---|---|
| Meetup NYC public events/groups | social/hobby/professional | DISCOVERY_ONLY | Current NYC surface contains public technology, board-game, photography, language, social, walking and other groups. Use for discovery only unless terms/API access and source contract are approved. Respect members-only visibility. |
| Wild Apricot association calendars | professional/social association | DISCOVERY_ONLY | Platform-family adapter candidate when a NYC organization exposes a public calendar. Never ingest membership directories. |
| neighborhood associations / block associations / historical societies | civic/social | QUALIFY_NOW | Prefer organization-owned public event pages/ICS/JSON-LD; repeated venue/organizer evidence can surface new calendars. |
| Rotary/Lions/service clubs, photography clubs, running/cycling/book/chess clubs | social/service/hobby | QUALIFY_NOW | Organization-owned public calendars are preferred; platform aggregators remain discovery aids. |

## H. Volunteer, faith and community organizations

| Source | Sector | Disposition | Why it matters / qualification work |
|---|---|---|---|
| NYC service/volunteer organizations with public opportunity calendars | volunteer/community | QUALIFY_NOW | Public volunteer shifts, drives and community events may qualify if event-like, time-bounded and public. Do not expose volunteer identities. |
| houses of worship and faith/community centers | religious/community | VENUE_LEAD | Public concerts, food drives, fairs, classes and community programs can qualify. Worship schedules/private pastoral/member activity are outside automatic discovery unless explicitly public-event eligible. |
| JCC/YMCA/community nonprofit calendars | community | QUALIFY_NOW | Qualify institution/platform adapters; retain public access and registration requirements. |

## I. Markets, fairs, food and public-space programming

| Source | Sector | Disposition | Why it matters / qualification work |
|---|---|---|---|
| GrowNYC Greenmarket / market schedules | market/community | QUALIFY_NOW | Recurring market occurrences need recurring-series identity plus date/season exceptions. |
| street fairs / plazas / BID public programming | market/public-space | QUALIFY_NOW | Combine permitted-event evidence with organizer/BID first-party calendars; dedupe shared occurrences. |
| NYC Open Streets / plaza programming | public-space/community | QUALIFY_NOW | Street/open-space status alone is not an event; qualify actual scheduled programming separately. |
| waterfront/park conservancy calendars | parks/community/culture | QUALIFY_NOW | Prospect Park Alliance, Central Park Conservancy, Brooklyn Bridge Park and similar first-party calendars can add events not fully covered in city feeds. |

## J. Discovery protocols BORG must support

Priority adapter families:

1. JSON/REST APIs.
2. Socrata SODA.
3. Localist API / public Localist event-place graph.
4. iCalendar (`VEVENT`) / WebCal.
5. Schema.org `Event` JSON-LD with `Place` and `organizer`.
6. RSS/Atom when event identity/date/location are explicit.
7. Stable first-party HTML calendar parser only when no structured source exists and terms/robots permit it.
8. Platform discovery (Meetup/Mobilize/Action Network/etc.) only under explicit terms/access/source-contract review.

## K. VenueIdentity discovery loop

For every public candidate, retain public evidence links for:

`event -> organizer -> venue -> official venue page -> venue calendar/feed -> other public organizers/events -> additional venues`

Investigation triggers (not publication triggers):

- authoritative platform venue ID; or
- same normalized venue observed in 3 public occurrences; or
- same normalized venue used by 2 independent public organizers.

A venue lead may produce a new source candidate, but every event still passes OccurrenceIdentity, temporal/status, public-access and Projector V3 gates.

## L. Public-access policy

Normalize `public_access` as:

- `PUBLIC`
- `REGISTRATION_REQUIRED`
- `TICKET_REQUIRED`
- `MEMBERS_ONLY`
- `STUDENTS_ONLY`
- `INVITE_ONLY`
- `PRIVATE`
- `UNKNOWN`

Reader eligibility: `PUBLIC`, `REGISTRATION_REQUIRED`, and `TICKET_REQUIRED` may proceed to normal source review. The others fail closed to review/exclusion until public eligibility is proven.

Do not collect attendee lists, student identities, membership rolls, donor/supporter lists, RSVP identities, private addresses disclosed only after registration, or infer political/religious affiliation of individuals.

## M. Immediate build order

### Wave 0 — preserve and recertify
1. NYC Permitted Event Information.
2. NYC Parks upcoming events.
3. NYC Citywide Events Calendar.

### Wave 1 — high-volume public programming
1. NYPL.
2. Brooklyn Public Library.
3. Queens Public Library.
4. CUNY central events.
5. NYU public events.
6. NYC Council meetings/hearings.
7. Community Board calendars.
8. Lincoln Center.

### Wave 2 — venue/culture/sports
1. MSG + Knicks/Rangers.
2. Barclays + Nets/Liberty.
3. Yankees/Mets.
4. Met/MoMA/Carnegie Hall/92NY.
5. major parks/conservancies and public-space calendars.

### Wave 3 — community/social/political graph expansion
1. DYCD/community centers.
2. YMCA/JCC/community nonprofit calendars.
3. neighborhood/civic/service clubs.
4. public political-club and advocacy calendars across viewpoints.
5. Meetup/Mobilize/Action Network as discovery surfaces under platform rules.
6. venue-following recursion from repeated public event evidence.

## N. Definition of currentness

Each qualified source contract must record:

- `verified_at`
- source URL/API root
- stable source/platform ID
- last successful live fetch
- latest source-updated timestamp if available
- expected update cadence
- next freshness deadline
- schema fingerprint/version
- pagination proof
- cancellation/amendment semantics
- public-access semantics
- location/geometry provenance
- rights/terms state
- health state: `LIVE`, `STALE`, `FAILED`, `UNKNOWN`

A source past its freshness SLA may never remain green merely because a historical fetch succeeded.

## Non-authorization

This census does not authorize production enablement, credentials, browser-side direct fetching, WordPress changes, publication, map pin creation, merge to main, or deployment. New sources remain candidates until their exact adapters/contracts pass review and downstream zero-loss/authority gates.
