# Official program destinations: review and rollback

Baseline: `0be0f0194cc73e2c1c38124fe6240163a32f95f4` (frontend),
`c298a36ff40df21dcdc5e990e0896438e0215d54` (backend).
Branch: `feat/official-program-links` in each repository. No production action is authorized.

Public and authenticated detail pages share `ProgramDestinations`: the university program information page is first
and primary, admissions information is secondary, and Apply is secondary and uses only the API's cycle-eligible URL.
Missing program destinations are explicit. Legacy Studyinfo source URLs cannot appear as the university destination.
When a verified submission route uses Studyinfo, the national portal is explained. HTTPS URLs with no embedded
credentials are accepted; links announce their new tab and use noopener/noreferrer. Existing theme/button tokens
and responsive sizing are retained. English and Russian copy are supplied.

Public detail never passes a protected application URL into this component. Existing public/private API routes,
field boundaries, session handling, profiles, account flows and save identifiers stay intact.
The authenticated verification caption now describes program identity verification, avoiding the implication that
every official link or tuition fact was just checked.

No dependency, schema, hosting, credential or scheduled job change. Both CLI and data operations live on the backend
and are disabled by default. The backend coverage report lists all 56 hosted programs (all masters), the five verified
Aalto/Oulu link candidates and 51 outstanding associations. No new tuition, admissions or application facts are claimed.

Tests: unit tests cover destination order, unknowns, national-portal explanation, invalid URLs, protected-field behavior
and external-link attributes. Existing desktop/mobile public browsing, auth, profile, saved-program and accessibility
tests run as part of the full suite. Local validation passed: formatting, ESLint, type generation/TypeScript,
144 unit tests, production build, and 403 browser tests (7 existing device-specific skips). The Windows browser
run needed its own Next server stopped during teardown; the runner then exited 0. Hosted CI is required separately.

Rollback: revert this focused UI commit through a reviewed PR. API field names and route contracts are unchanged,
so the baseline frontend remains compatible with the proposed backend. No database restoration is needed for the UI.
Backend data backfill requires separate approval and its own verified backup/scoped restore procedure.
Do not merge, push to main, deploy or run production migrations/backfills without the owner's explicit approval.
