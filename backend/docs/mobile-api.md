# Mobile execution API rollout

The existing web API remains available. New endpoints extend `/api`; IDs in the new endpoints are strings and timestamps are UTC ISO 8601. Auth responses keep their legacy numeric user ID and numeric role (`0` traveler, `1` admin, `2` business). Errors include `code` and `message`. OpenAPI: [`mobile-openapi.json`](mobile-openapi.json).

## Schema and migration

`20261124090000_mobile_executions` adds `trip_executions` and `trip_execution_stops`, with no updates/deletes of existing rows. A nullable unique `active_user_id` enforces one active trip per person; `(itinerary_id,user_id)` enforces one execution per person/plan. Stop snapshots do not reference mutable source items. Deleting a finished source plan cascades its execution records; deletion is blocked while any execution is active, including through admin.

Before rollout, inspect `prisma migrate status`, back up the database, then use the project's existing `npm run db:generate` and `npm run db:migrate` workflow. Do not use `db push` or seed an existing production database. Restart the backend after migration.

The local database inspected during implementation also had older pending migrations `20261112120000_avatar_uploads`, `20261112124500_enable_email_notifications` and `20261118160000_business_management`. In particular, the old email migration changes existing `notify_by_email=false` preferences to true. These were not applied automatically to the user's data. The new implementation was exercised on fully migrated disposable databases instead. Review those older migrations before running deploy against that local database.

## Execution contract

- `POST /itineraries/:id/execution` creates/returns the caller's execution. Membership (owner or explicitly granted collaborator, including view permission) is required; a public link alone grants no execution/location access. Empty plans are rejected.
- `GET /itineraries/:id/execution` returns only the caller's execution, or `null` if not started. Snapshots freeze plan name, destination, dates, stop names/addresses/coordinates/day/time/note.
- `PATCH /executions/:id/stops/:stopId` accepts `{status,version}`. Transitions: pending → arrived/skipped; arrived → completed/skipped. Terminal states cannot be undone. A repeated same-state request returns current state without changing timestamps/version. Other stale-version writes return 409 `VERSION_CONFLICT`.
- `POST /executions/:id/finish` accepts `{version}`; unresolved stops return 409. Finish releases the active-user slot and clears location. Source itinerary status is never changed by personal execution.
- Removing a collaborator, either by the sharing API or complete plan editor, cancels their active execution, releases their slot and clears their location. Re-adding does not reopen that cancelled execution in this MVP.
- All execution mutations serialize on user/plan/execution rows. Read Committed isolation avoids unrelated plan deletion transactions contending on empty execution index gaps.

Arrival is a manual personal action, not evidence for a business verified review. Existing GPS check-in and review rules are unchanged.

## Location contract

`PUT /executions/:id/location-sharing {enabled}` defaults to off. Every toggle rotates `sharingVersion` and clears the sample. Enabling returns `uploadToken` (24 hours), scoped to that user/execution/sharing version. It cannot authenticate ordinary APIs. Android holds it only in service memory.

- `PUT /executions/:id/location-upload`: capability Bearer token plus `{latitude,longitude,accuracyMeters,capturedAt}`. The version is taken from the verified capability, not the body. Current membership, active account and active sharing are rechecked.
- `POST /executions/:id/location-stop`: capability token revokes only its own sharing version. A delayed stop from an earlier service cannot turn off a newly enabled session.
- `PUT /executions/:id/location`: alternative full-account Bearer upload with the same sample plus `sharingVersion`.
- `GET /itineraries/:id/member-locations`: latest shared samples from current active members only, with names, accuracy, timestamps and `stale` after two minutes. Removed/disabled accounts are excluded. No route history or public-link access.

Coordinates must be finite numeric values in range, accuracy `(0,10000]` meters, sample age ≤2 minutes, future clock skew ≤10 seconds. Older/out-of-order samples cannot overwrite a newer sample. Uploads are capped at 10/min/account per route. Samples ≥24 hours old are hidden immediately and physically cleared by the backend's one-minute cleanup timer. Server restart runs cleanup again. No raw coordinates or tokens are emitted to application logs.

Android starts the location foreground service only from an explicit action in the visible app, requests location/notification permission, keeps a visible stop control, and does not silently restart after force-stop/reboot. HTTPS is mandatory in release. Physical-device and distribution checks must still be performed before release; see [Android foreground location rules](https://developer.android.com/about/versions/14/changes/fgs-types-required).

## Compatibility and operations

- Existing chat array responses stay arrays, now containing the newest 100 direct / 200 group messages in ascending ID order. New `/:friendId/messages` and `/group/:itineraryId/messages` endpoints return `{items,nextCursor}` for older history, with limit ≤100. Cursor is the oldest returned ID; pagination order does not depend on timestamps.
- `/itineraries/summary` returns lightweight `{items,nextCursor}`, limit ≤50. The full list endpoint is unchanged for web callers.
- `POST /auth/google/mobile` uses `GOOGLE_MOBILE_SERVER_CLIENT_ID` as audience and `GOOGLE_MOBILE_CLIENT_IDS` for allowed `azp`/presenter IDs. Web Google Origin/nonce verification is unchanged.
- Refresh-token consumption and replacement are one transaction with an atomic single-use claim. Clients must serialize refreshes; the Flutter and existing web clients do so.
- A valid logout revokes that account's shared location sessions and clears their latest samples, including when the Android service has already stopped. A retained old upload capability can no longer publish after logout.
- `POST /locations` requires traveler auth. `POST /locations/ensure` additionally permits 10/min/account. `POST /locations/cache` requires admin, capped at 5/min. `GET /locations/cache` returns 405 and performs no write.
- `/weather` proxies the private Python service (`PYTHON_AI_URL`, 12-second timeout), returning a controlled 503 on upstream failure. Web weather now uses the same base URL as the rest of the API. Keep Python's AI/cache endpoints off the public network.
- Rate-limit counters are process-local. Use a shared limiter before multiple replicas; configure trusted proxy addresses explicitly if deploying behind a reverse proxy. Do not blindly enable `trust proxy`.

Monitor aggregate 401/403, 409 conflicts, 429 limits, upstream weather failures and accepted sample age using deployment request metrics. Never log request bodies/authorization headers on location/auth routes. This change adds functional error codes, not a new telemetry service.

## Validation

`node src/scripts/testMobile.js --regression` creates a randomly named test database, deploys all migrations, checks execution/member isolation, duplicate starts, conflicts, snapshots, capability scope/revocation, refresh races, pagination, authorization and weather, then runs the selected seeded web/backend regressions. Only that generated database is dropped. The default `npm test` skips this new integration test unless the disposable-database environment guard is present.

Out of scope: iOS, offline execution synchronization, automatic geofencing, route history, reopening trips, push reminders, password recovery and account deletion. The Flutter UI currently covers authentication, the trip list/basic planner, execution and the group map; the rest of the established web UI is not duplicated.

Android emulator smoke checks during implementation confirmed password sign-in, loading a shared plan, starting an execution, recording arrival, uploading a simulated GPS fix while the app was on the Home screen, reading that fix through the second member's account, and removing it by tapping the native notification's stop action. A debug APK was built and installed. Physical-phone battery/OEM behavior and live Google OAuth remain unverified without device/OAuth configuration.
