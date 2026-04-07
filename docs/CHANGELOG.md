# Changelog

## [Unreleased]

### Added
- **Transport_bridge module type** -- unified provider interface for transport abstraction. (#5726)
- **KeeperTurnCycle TLA+ spec** -- 7-state turn execution model for formal verification. (#5728)

### Fixed
- **cascade.json model IDs** -- replace `glm:auto` / `ollama:auto` with concrete model IDs (`glm:glm-5.1`, `ollama:qwen3.5:9b-nvfp4`) to fix 3,371+ "model not found" errors. (#5741)
- **Transport registry seal** -- seal registry after bootstrap for fiber safety. (#5735)
- **Cascade key names** -- use correct `keeper_unified_models` and `ollama:auto` in cascade config. (#5727)
- **Cascade model split** -- split cascade models: glm as default, ollama per-keeper. (#5724)

### Changed
- **Room claim/transition** -- flatten `claim_task_r` and `transition_task_r` using let* bindings. (#5725)

## [2.257.0] - 2026-04-07

### Added
- **Ollama first-class local adapter** -- add Ollama as a first-class local provider. (#5707)
- **TLA+ formal verification models** -- add formal verification models for OAS bridge and MASC ecosystem. (#5715)
- **TLA+ trace validation** -- QCheck PBT + TLC runner infrastructure. (#5720)
- **Inference telemetry** -- record inference telemetry to decisions.jsonl and costs.jsonl. (#5714)
- **Context lifecycle TLA+ spec** -- multi-keeper isolation tests. (#5716)
- **Gate-Connector protocol spec** -- draft specification and OCaml sketch. (#5710)

### Fixed
- **Model ID resolve** -- fix model ID in oas_worker_exec failsafe path. (#5721)
- **Cascade concrete ollama model** -- raise retry tool cap. (#5722)
- **Retry autoboot** -- retry autoboot for keepers that fail initial startup. (#5718)
- **Idle rules** -- add idle rules to prevent tool call repetition. (#5719)
- **Dashboard pipeline stage colors** -- align colors and add scheduled_autonomous CSS. (#5706)
- **Boring consecutive turns** -- persist boring_consecutive_turns across run_turn calls. (#5693)
- **Cumulative input token budget** -- remove cumulative budget, retry on TokenBudgetExceeded. (#5677)
- **Dashboard phase strip colors** -- fix event label rendering. (#5683)
- **Dashboard transient stages** -- handle transient pipeline stages and nullish event labels. (#5700)
- **Keeper workspace path** -- add workspace path and PR workflow to capabilities prompt. (#5674)
- **System prompt** -- include [STATE] template in system prompt. (#5676)
- **Heartbeat snapshot** -- report actual usage instead of hardcoded zeros. (#5703)

### Changed
- **Keeper exec_tools split** -- refactor god file into focused modules. (#5708)
- **Dashboard activity graph** -- slim down activity graph, keeper detail, and overview. (#5699)
- **Room step execution** -- flatten using let* Result bind. (#5694)
- **PR workflow** -- flatten using Result bind. (#5682)
- **Server handle_post_mcp** -- flatten using let* Result bind. (#5690)
- **Dashboard SupervisorDiagnosticsPanel** -- extract to separate file. (#5689)
- **Dashboard recent activity** -- merge into profile, consolidate KPI hints, fix debug section. (#5678)
- **Dashboard duplicate tools** -- remove duplicate "윈도우 상위 도구" from KeeperNeighborhood. (#5692)
- **Collaboration module references** -- remove OAS boundary violation references. (#5705)
- **OAS agent_sdk pin** -- bump to >= 0.112.0 (ollama auto-resolve). (#5709)

### Removed
- **Collaboration module references** -- OAS boundary violation cleanup. Delete team_context_oas_adapter, dashboard_collaboration_evidence, related tests/harness/routes (-1916 lines).

### Infrastructure
- **Dev-dashboard Makefile** -- add target for Vite HMR proxy. (#5691)
- **Cascade.json migration** -- migrate to ollama + simplify 40 entries to default_models. (#5685)
- **Worktree branch handling** -- use -B (force-branch) for stale branches. (#5688)
- **PBT verification** -- property-based verification for compaction-budget fix. (#5713)

## [2.256.0] - 2026-04-07

### Changed
- **OAS agent_sdk pin** -- bump 0.110.0 to 0.111.0 (ollama provider).

## [2.255.0] - 2026-04-07

### Added
- **TopK_llm tool selection** -- activate OAS Tool_selector.TopK_llm in keeper
  before_turn_hook. 2-stage selection: BM25 pre-filter then LLM reranking via
  `default_rerank_fn`. Gated by `MASC_KEEPER_LLM_RERANK=true` (default off).
  Self-healing fallback to BM25 on LLM failure. 8 new tests.

## [2.254.0] - 2026-04-07

### Added
- **Post-turn evidence capture** -- execution context tracking for keeper decisions. (#5621)
- **Anti-polling gate** -- boring-tool gate to break keeper polling loops. (#5623)
- **TF-IDF synonym expansion** -- 39 more tool synonyms for prefilter. (#5628)
- **OAS Event Bus pipeline** -- connect OAS telemetry to keeper Agent.run. (#5641)
- **Runtime params dashboard** -- migrate 25 keeper params to Runtime_params. (#5640)
- **Silent failure logging** -- error visibility in hotspots. (#5632)
- **Startup readiness gate** -- keeper_up returns structured error with retry_after_ms when server not ready. (#5608)
- **Telemetry in decision records** -- add telemetry block to keeper decision records. (#5617)
- **Cross-keeper file collision detection** -- process-scoped tracker warns when two keepers modify the same file within 300s. (#5621)

### Changed
- **OAS agent_sdk pin** -- bump 0.109.0 to 0.110.0 (inference telemetry, tool_choice propagation, watermark compaction). (#5639)
- **tool_shard** -- replace Hashtbl with immutable StringMap. (#5593)
- **Anti-polling gate simplification** -- per-review refactor. (#5645)
- **Keeper_event_bus module** -- extracted from Keeper_keepalive to break dependency cycles. (#5641)
- **Cache deduplication** -- deduplicate read+parse via read_entry_file. (#5647)

### Fixed
- **keeper_agent_sender mismatch** -- unified to meta.agent_name, fixing task release/cancel failures. (#5625, #5629)
- **code_search error messages** -- include exit code, default to literal match. (#5630, #5634)
- **Keeper status fallback** -- file-read recovery hints, subprocess stderr. (#5595)
- **Compaction unblock** -- when reflection_ts=0 or ratio>=0.8. (#5600)
- **Core discovery tools** -- add masc_web_search and shell_readonly. (#5622)

### Infrastructure
- **Vite bump** -- 6.4.1 to 6.4.2. (#5624)
- **.ci_build/ gitignore**. (#5643)

## [2.253.0] - 2026-04-07

### Added
- **Memory consolidation** -- short-term to long-term memory transfer. (#5588)
- **SearXNG web search** -- add web search tool for keepers. (#5591)
- **Slot pinning** -- llama-server KV cache reuse via slot_id. (#5583)
- **Self-directed autonomy triggers** -- token budget fix and autonomy. (#5594)
- **Per-turn wall-clock timeout** and slot yield. (#5603)

### Changed
- **Autonomous multi-step behavior** -- enable keeper multi-step. (#5592)
- **Default max_turns** -- 50 to 200 for autonomous PR workflow. (#5585)

### Fixed
- **extend_turns API** -- replace internal Agent.set_state with public API. (#5580)
- **Transient vs persistent failure** -- separate turn failure counting. (#5584)
- **stderr capture** -- capture in run_argv_with_status. (#5586)
- **fs_read hint** -- add parent directory hint on file-not-found. (#5589)

### Performance
- **Server-side cache** for keeper_status responses. (#5587)
- **mtime-based guard** -- skip meta disk read when mtime unchanged. (#5590)
