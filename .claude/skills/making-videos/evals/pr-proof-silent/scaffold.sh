#!/usr/bin/env bash
set -euo pipefail
mkdir -p shopfront
cat > shopfront/PR-42.md <<'MD'
# PR #42: Apply a discount code once per order

Bug: entering SPRING10 and pressing Apply twice took 10% off twice (20% total).
Fix: the cart stores applied codes as a set; the server rejects a second application with "Code already applied".

Staging: https://staging.shopfront.test (deployed from this branch). Test login: qa@shopfront.test.
To check: add the Blue Mug (20.00) to the cart, apply SPRING10, press Apply again. Expected total 18.00 and the message "Code already applied".
MD
