#!/usr/bin/env bash
set -euo pipefail
mkdir -p carenest-mobile/maestro carenest-mobile/src/api carenest-mobile/docs
cat > carenest-mobile/README.md <<'MD'
# CareNest (React Native)

Android build: `npx expo run:android`. CI and the QA team share the emulator AVD `shared-pixel` (port 5554); keep it running.
Maestro flows live in maestro/. Staging API: https://api.staging.carenest.test.
MD
cat > carenest-mobile/docs/accounts.md <<'MD'
Staging test accounts (synthetic people only): parent.demo@carenest.test, nurse.demo@carenest.test.
Passwords are in 1Password, vault "CareNest QA".
MD
cat > carenest-mobile/maestro/book-visit.yaml <<'MD'
appId: com.carenest.app
---
- launchApp
- tapOn: "Log in"
- inputText: ${EMAIL}
- tapOn: "Next"
- inputText: ${PASSWORD}
- tapOn: "Sign in"
- tapOn: "Book a visit"
- tapOn: "Tomorrow"
- tapOn: "10:00"
- tapOn: "Confirm"
- assertVisible: "Visit booked"
MD
cat > carenest-mobile/src/api/visits.ts <<'MD'
// POST /v2/visits creates a pending visit; the scheduler service confirms it within 30 s and pushes a notification.
export async function bookVisit(slotId: string) { return fetch(`/v2/visits`, { method: "POST", body: JSON.stringify({ slotId }) }); }
MD
