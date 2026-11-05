#!/usr/bin/env python3
"""Refuse a prompt that holds an API key or token.

A nudge, not a parser. In the week to 2026-11-05 the user pasted an OpenAI key, an OpenRouter key,
and an Anthropic OAuth token into chat, so each went into the model's context. The block message
ends with the prompt text unless the hook sets suppressOriginalPrompt, so this sets it. The
transcript and prompt history on disk still hold the text, so rotate a key that was pasted.
"""

import json
import re
import sys

KEY = re.compile(
    # OpenAI sk- and sk-proj-, OpenRouter sk-or-v1-, Anthropic sk-ant-api03- and sk-ant-oat01-,
    # with a digit so a placeholder such as sk-your-openai-key-goes-here passes.
    r"\bsk-(?=[\w-]*\d)[\w-]{20,}"
    r"|\bA[KS]IA[0-9A-Z]{16}\b"
    r"|\bgh[pousr]_[A-Za-z0-9]{36}\b|\bgithub_pat_\w{22,}"
    r"|\bxox[bp]-[\w-]{10,}"
    # Stripe, Linear, a 1Password service account, GitLab, npm, and Google.
    r"|\bsk_(?:live|test)_\w{20,}|\blin_api_\w{30,}|\bops_eyJ\w{40,}"
    r"|\bglpat-[\w-]{20}|\bnpm_\w{36}|\bAIza[\w-]{35}"
)

if not KEY.search(json.load(sys.stdin).get("prompt") or ""):
    sys.exit(0)
reason = (
    "Refused: this prompt holds what looks like an API key or token, so it was not sent. "
    "Store the secret in 1Password, in the app or with op item create in your own terminal, and "
    "pass the agent a reference such as op://<vault>/<item>/<field>, which it reads with op read. "
    "Rotate the key too, since the session log on disk still holds it."
)
print(json.dumps({
    "decision": "block",
    "reason": reason,
    "hookSpecificOutput": {"hookEventName": "UserPromptSubmit", "suppressOriginalPrompt": True},
}))
