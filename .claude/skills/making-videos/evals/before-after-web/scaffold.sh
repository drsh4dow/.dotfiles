#!/usr/bin/env bash
set -euo pipefail
mkdir -p ledgerly/docs
cat > ledgerly/README.md <<'MD'
# Ledgerly

Web app for accounts payable. Runs at http://localhost:5173 (`npm run dev`), staging at https://staging.ledgerly.test.
Test workspace "Ledgerly Demo" has synthetic suppliers only. Sign-in: demo@ledgerly.test (password in 1Password, "Ledgerly demo").

## New: Reconcile view (shipped to staging last week)
Sidebar > Reconcile. Each unmatched invoice shows the purchase order it most likely belongs to, a Match score,
and a one-line Reason. Approve matches it; Reject asks for a reason from a fixed list. Matching runs in the
background and takes 20 to 50 seconds per batch.
MD
cat > ledgerly/docs/today.md <<'MD'
# How matching works today (from the call with Ana and Ben)
- Each morning Ana exports invoices from the supplier portal to a spreadsheet, one supplier at a time.
- She copies each invoice number into the ERP search to find its purchase order.
- If amounts differ she emails the supplier and waits, often days.
- Ben checks her matches at the end of the week. They have never opened Ledgerly.
- They are frustrated: last quarter two invoices were paid twice.
MD
