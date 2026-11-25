# PlanTravel Android

Flutter companion app for personal trip execution and opt-in group location sharing. Android 8.0/API 26 or newer. Uses the same Express API and accounts as the web app.

## Run

Install Flutter stable compatible with the SDK constraint in `pubspec.yaml`, Android SDK, and Java. From this directory:

```powershell
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5000/api
```

`10.0.2.2` reaches the development computer from the Android emulator. For a physical phone use the computer's LAN address and allow the API port through its firewall. HTTP is enabled only in Android debug builds. Release requires an HTTPS API and your own signing key; no release signing secrets are checked in.

For native Google sign-in, register Android package `vn.plantravel.plantravel_mobile` and its signing certificate in Google Cloud. Supply the Web/server OAuth client ID to the build and backend:

```powershell
flutter run --dart-define=API_BASE_URL=https://api.example.com/api --dart-define=GOOGLE_SERVER_CLIENT_ID=YOUR_WEB_CLIENT_ID --dart-define=GEOAPIFY_API_KEY=YOUR_MAP_KEY
```

Backend configuration: `GOOGLE_MOBILE_SERVER_CLIENT_ID` must match `GOOGLE_SERVER_CLIENT_ID`; `GOOGLE_MOBILE_CLIENT_IDS` lists the allowed token authorized-party (`azp`) client IDs for your registered Android/server clients. The server verifies audience, presenter, issuer, signature, expiry and verified email. Password sign-in works independently. If the map key is omitted, the development map uses OpenStreetMap tiles with attribution; configure the existing Geoapify provider for deployment.

## What is implemented

- Password registration/sign-in and native Google sign-in; credentials stored with Flutter Secure Storage. Concurrent 401 responses share one refresh, and account changes cannot be overwritten by an older refresh.
- Paginated trip list, basic manual plan creation/editing (name, destination, custom stops), and viewing existing web plans. Editing preserves fields not exposed in the basic editor.
- Start a personal execution, follow the snapshotted stops, mark arrival/completion/skip, and finish. Progress is committed only after server acknowledgement. The complete web planner, AI planner, community, chat and business interfaces remain available on the web; they have not been recreated as Flutter screens.
- Group map with the latest shared location, capture time, accuracy and a stale label after two minutes. Group positions refresh every 15 seconds only while the execution screen is visible.
- Opt-in native Android foreground location service, started from the visible app, with a persistent notification and **Dừng chia sẻ** action. It requests new GPS/network fixes and attempts upload every 30 seconds when a fresh sample exists. It holds only the latest sample in memory and a scoped 24-hour upload capability, not account access/refresh tokens.
- Leaving the execution screen or locking the phone keeps the service running. Stop, finish and logout clear the sharing session; the server also cancels a removed member's active execution and rejects its uploads. Expired/revoked capabilities stop the service.

## Limits and recovery

- This version does not restart location tracking after force-stop, process death or reboot. Open the app and explicitly enable sharing again. OEM battery restrictions and network outages can delay updates; timestamps, not an assumed live indicator, show freshness. If GPS is denied, manual execution still works.
- No route history, automatic arrival detection, offline progress queue, iOS client, or push reminders. Only the newest location is retained; samples older than two minutes are rejected on upload and older than 24 hours are hidden and periodically purged.
- If the service is stopped while offline, remote revocation cannot be immediate; other members see the last sample become stale. Reconnect and turn sharing off in the app. A token naturally expires after 24 hours.
- A trip execution is one per person/plan, with one active trip per person. The MVP does not reopen completed trips. Source-plan edits do not alter an execution snapshot.

## Test without changing your local data

From `backend/`, run:

```powershell
node src/scripts/testMobile.js --serve
```

This creates a random `plantravel_mobile_test_*` database, deploys migrations, runs API integration checks, seeds demo accounts, and serves port 5011. Stop it with Ctrl+C to close the server and drop that temporary database. Use a local MySQL account allowed to create/drop databases.

```powershell
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5011/api
flutter analyze
flutter test
flutter build apk --debug
```

The test preview uses demo traveler `an.nguyen.traveler@gmail.com` / `travel123456`, and `linh.le.wanderlust@gmail.com` / `travel123456`. Do not use these demo credentials in deployment.

Backend regression command: `node src/scripts/testMobile.js --regression`. It always creates and deletes its own test database; it never applies migrations to the configured application database.

API contract: [mobile-openapi.json](../backend/docs/mobile-openapi.json), also served at `/api/mobile/openapi.json`. Rollout notes: [mobile-api.md](../backend/docs/mobile-api.md).

## Device acceptance checklist

Use two Android phones/accounts in one group. Confirm independent stop progress, opt-in location visibility, screen-off uploads, notification stop, finish cleanup, removed-member rejection, airplane-mode recovery, GPS/permission revocation and force-stop recovery. Emulator/build checks do not establish battery/OEM behavior on physical phones.
