#!/usr/bin/env bash
set -euo pipefail
mkdir -p tilly-ios/Tilly/Onboarding tilly-ios/docs
cat > tilly-ios/README.md <<'MD'
# Tilly (iOS, SwiftUI)

Build: open Tilly.xcodeproj in Xcode 18 and run the "Tilly" scheme on an iPhone 17 simulator.
UI tests in TillyUITests drive onboarding with accessibility identifiers (onboarding.continue, onboarding.allowNotifications).
Onboarding: Welcome -> Your name -> Pick a plan -> Notifications permission -> Home.
MD
cat > tilly-ios/docs/onboarding.md <<'MD'
Pick a plan reads the plan list from GET /v1/plans (cached for 24 h). The notifications screen calls
UNUserNotificationCenter.requestAuthorization; if the user declines, Home shows a reminder banner.
MD
printf 'struct WelcomeView {}\n' > tilly-ios/Tilly/Onboarding/WelcomeView.swift
