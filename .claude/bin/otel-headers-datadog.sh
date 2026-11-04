#!/bin/sh
# Prints the OTLP headers Datadog's intake needs. The key lives in 1Password;
# the tmpfs copy keeps 1Password from prompting on every Claude Code start.
set -eu
cache="${XDG_RUNTIME_DIR:?}/claude-otel-dd-api-key"
if [ ! -s "$cache" ]; then
  key=$(op read 'op://Engineering/oa5lt7m4xn7v4y7fsuc4kuiaxm/notesPlain' |
    awk 'p { print; exit } /^MOBILE_PROVIDER_DATADOG_RUM_API_KEY$/ { p = 1 }')
  [ "${#key}" -eq 32 ] || { echo "no Datadog API key in 1Password note" >&2; exit 1; }
  (umask 077 && printf '%s' "$key" > "$cache")
fi
jq -cn --rawfile key "$cache" \
  '{"dd-api-key": $key, "dd-otel-metric-config": "{\"resource_attributes_as_tags\":true}"}'
