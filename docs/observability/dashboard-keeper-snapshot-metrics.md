---
status: reference
last_verified: 2026-04-24
code_refs:
  - lib/operator/operator_control_snapshot.ml
  - lib/prometheus.ml
---

# Dashboard Keeper Snapshot Telemetry

`Operator_control_snapshot.keepers_json` now emits both slow-path logs and bounded-cardinality Prometheus series so dashboard refresh stalls can be attributed without turning on always-on debug logging.

## Logs

Per-keeper detail logs are emitted when any of these thresholds trip:

- `total_ms >= 300`
- `wait_ms >= 500`
- `audit_ms >= 200`

Format:

```text
[keepers_json:<keeper>] detail lightweight=<true|false> wait_ms=... work_ms=... total_ms=... meta_ms=... agent_ms=... keepalive_ms=... audit_ms=... audit_recent_tools_ms=... audit_snapshot_ms=... audit_heartbeat_ms=... profile_ms=... phase_ms=... activity_ms=... audit_cache_source=<cache|recomputed> dominant_stage=...
```

Roll-up logs are emitted when the full `keepers_json` section takes at least `500ms`:

```text
[keepers_json] rollup keeper_count=... slow_keeper_count=... slowest_keeper=... slowest_total_ms=... max_wait_ms=... dominant_stage=... total_ms=...
```

## Metrics

All metrics are available from `/metrics`.

### `masc_dashboard_snapshot_section_duration_seconds`

- Labels: `section`
- Captures `snapshot_json` section timings such as `keepers_json`, `pending_confirms`, `persistent_agents_json`

### `masc_dashboard_keeper_snapshot_wait_duration_seconds`

- Labels: `lightweight`
- Measures semaphore wait time before a keeper fiber starts work

### `masc_dashboard_keeper_snapshot_work_duration_seconds`

- Labels: `lightweight`
- Measures per-keeper work time after semaphore acquisition

### `masc_dashboard_keeper_snapshot_stage_duration_seconds`

- Labels: `stage`, `lightweight`
- `stage` values:
  - `meta`
  - `agent`
  - `keepalive`
  - `audit`
  - `audit_recent_tools`
  - `audit_snapshot`
  - `audit_heartbeat`
  - `profile`
  - `phase`
  - `activity`

### `masc_dashboard_keeper_audit_source_total`

- Labels: `source`, `lightweight`
- `source` values: `cache`, `recomputed`

## Cardinality Rule

Keeper names stay in logs only. Prometheus labels intentionally exclude keeper identity so the series count remains bounded as the fleet changes.
