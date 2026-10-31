# Agent rules

- Never hold a CPU core with nothing to stop it.
- Run a command that takes minutes with `run_in_background: true`. Do any other work while it runs. Stop and wait for its completion notice only when nothing else is left, and never poll it.
