#!/usr/bin/env bash
set -euo pipefail
mkdir -p ledgerctl/bin
cat > ledgerctl/README.md <<'MD'
# ledgerctl

- `ledgerctl sync` pulls the latest bank transactions (needs `LEDGER_TOKEN`; use the sandbox token for demos).
- `ledgerctl match --since 7d` proposes a ledger entry for each unmatched transaction and prints a confidence.
- `ledgerctl post --approve <id>` posts an approved entry; `--dry-run` shows what would be posted.
Exit codes: 0 ok, 3 nothing to do, 4 needs review.
MD
cat > ledgerctl/bin/ledgerctl <<'SH'
#!/usr/bin/env bash
case "$1" in
  sync) echo "Pulled 42 transactions from Sandbox Bank (3 accounts)";;
  match) printf 'ID     AMOUNT    PAYEE            ENTRY            CONF\ntx-101  -84.20   Northwind Cafe   Meals            0.97\ntx-102  -1200.00 Contoso Lease    Rent             0.99\ntx-103  -19.99   Unknown Vendor   ?                0.41\n'; exit 4;;
  post) echo "Posted tx-101 to Meals (dry run: ${2:-})";;
  *) echo "usage: ledgerctl sync|match|post"; exit 2;;
esac
SH
chmod +x ledgerctl/bin/ledgerctl
