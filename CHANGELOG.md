# Changelog

## [Unreleased]

### Added
- _(pending)_

### Fixed
- _(pending)_

### Changed
- _(pending)_

## [2.261.0] - 2026-04-08

### Added
- Per-keeper provider filter via `allowed_providers` config (#5831)
- Preset-aware task routing — keepers only claim tasks matching their preset (#5820)
- 11-state keeper phase diagram in dashboard (#5829)
- Excuse patterns editor UI with server-side validation (#5818)
- Output validation stats in tool-quality dashboard (#5832)
- Dashboard SSE `keeper_tool_skipped` event + centralized thresholds (#5824)
- Deterministic tool output validation (Samchon-style schema constraints) (#5821)
- Analyst persona (verification-driven) (#5850)

### Changed
- Upgraded orchestrator to pass preset through to agent lifecycle (#5820)
- Dashboard sidebar now shows preset badge per keeper (#5820)

### Fixed
- Dashboard crash when `keeper_tool_skipped` arrived for untracked tool (#5824)
- Tool output validator returning false positives on empty-string defaults (#5821)

## [2.260.0] - 2026-04-07

### Added
- Strict tool output validation with schema-based constraints (#5795)
- Tool quality dashboard panel with pass/fail/skip counters (#5795)
- Keeper auto-bump with version truth file (#5784)
- Refusal-to-log guard — keeper skips logging for requests denied by policy (#5786)
- `Keeper_tool_skipped` SSE event for dashboard real-time notification (#5786)
- Sidecar container hook — optional sidecar process managed alongside each keeper (#5780)
- Configurable auto-bump cadence (daily/weekly/manual) (#5784)
- `excuse_patterns` config field with dashboard editor (#5780)

### Changed
- Merged dashboard panels into unified health monitor (#5795)
- Moved auto-bump logic from cron to in-process scheduler (#5784)
- Upgraded keeper policy to support sidecar process definitions (#5780)

### Fixed
- Dashboard rendering glitch on negative tool-quality counters (#5795)
- Auto-bump version file not updated when keeper restarted mid-cycle (#5784)
- Sidecar process leak when keeper crashed without cleanup (#5780)

## [2.259.0] - 2026-04-06

### Added
- Keeper memory bank with keyword search and structured notes (#5768)
- Board post voting and comment threading (#5769)
- `excuse_patterns` field in keeper config for creative deflection (#5768)
- MASC room broadcast with namespace-scoped delivery (#5769)

### Changed
- Replaced flat file-based memory with SQLite-backed memory bank (#5768)
- Board posts now support hearth channels (topic-based filtering) (#5769)

### Fixed
- Memory search returning stale entries after checkpoint reload (#5768)
- Board comment ordering inconsistent across page loads (#5769)

## [2.258.0] - 2026-04-05

### Added
- Keeper task queue with priority-based claiming (#5755)
- Agent heartbeat monitoring with zombie detection (#5755)
- Configurable keeper presets (coding, analysis, ops, admin) (#5754)

### Changed
- Task assignment now respects preset capabilities (#5755)
- Heartbeat interval made configurable per keeper (#5755)

### Fixed
- Task claiming race condition when multiple keepers claim simultaneously (#5755)
- Heartbeat thread deadlock during checkpoint save (#5755)

## [2.257.0] - 2026-04-04

### Added
- Initial public release of MASC-MCP
- Multi-agent coordination with streaming responses (#5701)
- Keeper lifecycle management (boot, cycle, turn, checkpoint) (#5701)
- Board system for cross-agent communication (#5702)
- Task backlog with priority and status tracking (#5703)
- Knowledge library with topic-based documents (#5704)

### Fixed
- Streaming response truncation on long keeper outputs (#5701)
- Board post ordering not respecting timestamps (#5702)
