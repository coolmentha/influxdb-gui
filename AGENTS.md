# AGENTS.md

Cross-agent conventions for this repo. Applies to any AI coding agent (ZCode, Claude, Cursor, Codex, etc.).

## Agent skills

### Issue tracker

GitHub Issues at https://github.com/coolmentha/influxdb-gui/issues, driven by the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical five-role vocabulary, no overrides: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo. `CONTEXT.md` and `docs/adr/` live at the repo root. See `docs/agents/domain.md`.
