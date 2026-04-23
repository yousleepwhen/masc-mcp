(** Prometheus-Compatible Metrics for masc-mcp

    Provides lightweight metrics collection and Prometheus text format export.

    Usage:
    {[
      let () = Prometheus.inc_counter "masc_tasks_total" ~labels:[("status", "completed")]
      let () = Prometheus.set_gauge "masc_active_agents" 5.0
      let text = Prometheus.to_prometheus_text ()
    ]}

    @since 0.4.0
*)

(** {1 Metric Types} *)

type label = string * string

type metric_type =
  | Counter
  | Gauge
  | Histogram

type metric = {
  name: string;
  help: string;
  metric_type: metric_type;
  mutable value: float;
  labels: label list;
}

(** {1 Global Metrics Store}

    [metrics] is updated from any fiber on any domain — LLM telemetry,
    keeper heartbeats, SSE bookkeeping, HTTP handlers. The previous
    implementation used a bare [Hashtbl.t] with [find_opt] + [add] which
    has two race windows:

    1. TOCTOU on registration: two fibers call [inc_counter] on a new
       key, both see [None], both [Hashtbl.add] — duplicate entries in
       the table.
    2. Non-atomic float update: [m.value <- m.value +. delta] reads,
       adds, writes without a memory barrier; two concurrent increments
       can both observe the same old value.

    We serialise every read and write path through [Stdlib.Mutex].
    Choice of primitive: operations must work during module
    initialisation ([let () = init ()] at EOF runs before any Eio
    scheduler exists), must hold across OCaml 5 domains (Executor_pool
    workers), and are individually cheap (a Hashtbl op + a float add) so
    the lock is never held long. [Stdlib.Mutex] fits all three. *)

let metrics : (string, metric) Hashtbl.t = Hashtbl.create 64
let metrics_mutex = Stdlib.Mutex.create ()

let with_lock f =
  Stdlib.Mutex.lock metrics_mutex;
  Fun.protect
    ~finally:(fun () -> Stdlib.Mutex.unlock metrics_mutex)
    f

(** {1 Metric Registration} *)

let register_counter ~name ~help ?(labels=[]) () =
  let key = name ^ (List.fold_left (fun acc (k, v) -> acc ^ k ^ v) "" labels) in
  with_lock (fun () ->
    if not (Hashtbl.mem metrics key) then
      Hashtbl.add metrics key { name; help; metric_type = Counter; value = 0.0; labels })

let register_gauge ~name ~help ?(labels=[]) () =
  let key = name ^ (List.fold_left (fun acc (k, v) -> acc ^ k ^ v) "" labels) in
  with_lock (fun () ->
    if not (Hashtbl.mem metrics key) then
      Hashtbl.add metrics key { name; help; metric_type = Gauge; value = 0.0; labels })

let register_histogram ~name ~help ?(labels=[]) () =
  let key = name ^ (List.fold_left (fun acc (k, v) -> acc ^ k ^ v) "" labels) in
  with_lock (fun () ->
    if not (Hashtbl.mem metrics key) then
      Hashtbl.add metrics key { name; help; metric_type = Histogram; value = 0.0; labels })

(** {1 Metric Updates} *)

let inc_counter name ?(labels=[]) ?(delta=1.0) () =
  let key = name ^ (List.fold_left (fun acc (k, v) -> acc ^ k ^ v) "" labels) in
  with_lock (fun () ->
    match Hashtbl.find_opt metrics key with
    | Some m -> m.value <- m.value +. delta
    | None ->
        Hashtbl.add metrics key {
          name;
          help = name;
          metric_type = Counter;
          value = delta;
          labels;
        })

let set_gauge name ?(labels=[]) value =
  let key = name ^ (List.fold_left (fun acc (k, v) -> acc ^ k ^ v) "" labels) in
  with_lock (fun () ->
    match Hashtbl.find_opt metrics key with
    | Some m -> m.value <- value
    | None ->
        Hashtbl.add metrics key {
          name;
          help = name;
          metric_type = Gauge;
          value;
          labels;
        })

let inc_gauge name ?(labels=[]) ?(delta=1.0) () =
  let key = name ^ (List.fold_left (fun acc (k, v) -> acc ^ k ^ v) "" labels) in
  with_lock (fun () ->
    match Hashtbl.find_opt metrics key with
    | Some m -> m.value <- m.value +. delta
    | None ->
        Hashtbl.add metrics key {
          name;
          help = name;
          metric_type = Gauge;
          value = delta;
          labels;
        })

let dec_gauge name ?(labels=[]) ?(delta=1.0) () =
  inc_gauge name ~labels ~delta:(-.delta) ()

(** Get current metric value by name + labels (if any). *)
let get_metric_value name ?(labels=[]) () =
  let key = name ^ (List.fold_left (fun acc (k, v) -> acc ^ k ^ v) "" labels) in
  with_lock (fun () ->
    Hashtbl.find_opt metrics key |> Option.map (fun m -> m.value))

let metric_value_or_zero name ?(labels=[]) () =
  get_metric_value name ~labels () |> Option.value ~default:0.0

let metric_total name =
  with_lock (fun () ->
    Hashtbl.fold
      (fun _ (m : metric) acc ->
        if String.equal m.name name then acc +. m.value else acc)
      metrics 0.0)

(** Observe a histogram value.
    Tracks cumulative sum in the metric value; a matching _count counter
    is auto-created for computing averages. *)
let observe_histogram name ?(labels=[]) value =
  let key = name ^ (List.fold_left (fun acc (k, v) -> acc ^ k ^ v) "" labels) in
  let count_key = name ^ "_count" ^ (List.fold_left (fun acc (k, v) -> acc ^ k ^ v) "" labels) in
  with_lock (fun () ->
    (match Hashtbl.find_opt metrics key with
     | Some m -> m.value <- m.value +. value
     | None ->
         Hashtbl.add metrics key {
           name; help = name; metric_type = Histogram; value; labels;
         });
    (match Hashtbl.find_opt metrics count_key with
     | Some m -> m.value <- m.value +. 1.0
     | None ->
         Hashtbl.add metrics count_key {
           name = name ^ "_count"; help = name ^ " observation count";
           metric_type = Counter; value = 1.0; labels;
         }))

(** {1 Metric Name Constants}

    Exported so registration here and [inc_counter] / [set_gauge]
    call-sites in the keeper modules share a single source of truth.
    Without this, a typo on either side produces a dead series with
    no build error (the counter silently drifts to a new key).

    Convention: constant name drops the Prometheus convention suffix
    ([_total] for counters), full metric name lives on the right-hand
    side. Consumers import [Prometheus.<constant>] so the compiler
    catches typos. *)

(* Keeper turn lifecycle (registered in init, incremented in
   keeper_unified_turn.ml). *)
let metric_keeper_turns = "masc_keeper_turns_total"
let metric_keeper_input_tokens = "masc_keeper_input_tokens_total"
let metric_keeper_output_tokens = "masc_keeper_output_tokens_total"
let metric_keeper_cache_creation_tokens =
  "masc_keeper_cache_creation_tokens_total"
let metric_keeper_cache_read_tokens =
  "masc_keeper_cache_read_tokens_total"

(* Keeper compaction (keeper_compact_policy.ml, tool_keeper.ml). *)
let metric_keeper_compactions = "masc_keeper_compactions_total"
let metric_keeper_compaction_ratio_change =
  "masc_keeper_compaction_ratio_change"
let metric_keeper_compaction_saved_tokens =
  "masc_keeper_compaction_saved_tokens_total"
let metric_keeper_operator_compact = "masc_keeper_operator_compact_total"
let metric_keeper_operator_clear = "masc_keeper_operator_clear_total"

(* Keeper keepalive (keeper_keepalive.ml). *)
let metric_keeper_heartbeat_successes =
  "masc_keeper_heartbeat_successes_total"
let metric_keeper_heartbeat_failures =
  "masc_keeper_heartbeat_failures_total"
let metric_keeper_tool_call_duration =
  "masc_keeper_tool_call_duration_seconds"
let metric_keeper_write_meta_failures =
  "masc_keeper_write_meta_failures_total"
let metric_keeper_lifecycle_dispatch_rejections =
  "masc_keeper_lifecycle_dispatch_rejections_total"
let metric_keeper_paused_state_persist_errors =
  "masc_keeper_paused_state_persist_errors_total"
let metric_persistence_read_drops =
  "masc_persistence_read_drops_total"

(* OAS SSE relay (oas_sse_bridge.ml). *)
let metric_oas_sse_relay_retries =
  "masc_oas_sse_relay_retries_total"
let metric_oas_sse_relay_drops =
  "masc_oas_sse_relay_drops_total"
let metric_oas_sse_relay_queue_depth =
  "masc_oas_sse_relay_queue_depth"

(* MCP tool schema budget (set once at boot from mcp_server_eio.ml
   via [set_tool_schema_stats]). *)
let metric_mcp_tool_schema_count = "masc_mcp_tool_schema_count"
let metric_mcp_tool_schema_tokens_approx =
  "masc_mcp_tool_schema_tokens_approx"

(* Transport metrics — used in transport_metrics.ml. *)
let metric_sse_sessions = "masc_sse_sessions_total"
let metric_sse_broadcast_duration = "masc_sse_broadcast_duration_seconds"
let metric_sse_broadcast_events = "masc_sse_broadcast_events_total"
let metric_sse_stream_queue_depth = "masc_sse_stream_queue_depth"
let metric_sse_queue_depth_avg = "masc_sse_queue_depth_avg"
let metric_sse_queue_depth_max = "masc_sse_queue_depth_max"
let metric_sse_external_subscribers = "masc_sse_external_subscribers_total"
let metric_grpc_active_streams = "masc_grpc_active_streams_total"
let metric_grpc_heartbeat_latency = "masc_grpc_heartbeat_latency_seconds"
let metric_grpc_subscribers = "masc_grpc_subscribers_total"
let metric_grpc_events_delivered = "masc_grpc_events_delivered_total"
let metric_ws_sessions = "masc_ws_sessions_total"

(* Admission queue metrics — used in admission_queue_metrics.ml. *)
let metric_inference_queue_depth = "masc_inference_queue_depth"
let metric_inference_queue_inflight = "masc_inference_queue_inflight"
let metric_inference_queue_acquired = "masc_inference_queue_acquired_total"
let metric_inference_queue_wait = "masc_inference_queue_wait_seconds"
let metric_inference_queue_cancelled = "masc_inference_queue_cancelled_total"
let metric_inference_queue_max_concurrent = "masc_inference_queue_max_concurrent"

(* Agent health metrics — used in transport_metrics.ml. *)
let metric_agent_heartbeat_age_seconds = "masc_agent_heartbeat_age_seconds"
let metric_agent_stale_total = "masc_agent_stale_total"

(* Process-level FD gauges — used in init() and update_fd_gauges. *)
let metric_open_fds = "masc_process_open_fds"
let metric_fd_warn_threshold = "masc_process_fd_warn_threshold"

(* Core counters / gauges — used outside init. *)
let metric_mcp_requests = "masc_mcp_requests_total"
let metric_llm_inference_duration = "masc_llm_inference_duration_seconds"
let metric_after_turn_hook = "masc_after_turn_hook_total"
let metric_after_turn_telemetry_missing =
  "masc_after_turn_telemetry_missing_total"
let metric_after_turn_telemetry_zero_latency =
  "masc_after_turn_telemetry_zero_latency_total"
let metric_tasks = "masc_tasks_total"
let metric_errors = "masc_errors_total"
let metric_error_events = "masc_error_events_total"
let metric_active_agents = "masc_active_agents"
let metric_pending_tasks = "masc_pending_tasks"
let metric_uptime_seconds = "masc_uptime_seconds"
let metric_sse_connections_active = "masc_sse_connections_active"
let metric_sse_reconnects = "masc_sse_reconnects_total"
let metric_sse_idle_evictions = "masc_sse_idle_evictions_total"
let metric_sse_capacity_evictions = "masc_sse_capacity_evictions_total"
let metric_sse_write_failures = "masc_sse_write_failures_total"
let metric_sse_rejects = "masc_sse_rejects_total"
let metric_provider_prefix_cache_creation_tokens =
  "masc_provider_prefix_cache_creation_tokens_total"
let metric_provider_prefix_cache_read_tokens =
  "masc_provider_prefix_cache_read_tokens_total"
let metric_tool_call = "masc_tool_call_total"
let metric_tool_call_duration = "masc_tool_call_duration_seconds"
let metric_llm_provider_http_status = "masc_llm_provider_http_status_total"
let metric_llm_provider_request_latency =
  "masc_llm_provider_request_latency_seconds"

(* Domain-specific counters not yet constant-ised. *)
let metric_board_truncated_posts = "masc_board_truncated_posts_total"
let metric_cascade_strategy_decisions = "masc_cascade_strategy_decisions_total"
let metric_cascade_capacity_events = "masc_cascade_capacity_events_total"
let metric_keeper_invariant_violations = "masc_keeper_invariant_violations_total"
let metric_oas_bus_subscriber_stream_depth = "masc_oas_bus_subscriber_stream_depth"
let metric_oas_bus_publish_block_seconds = "masc_oas_bus_publish_block_seconds_total"
let metric_oas_bus_publish = "masc_oas_bus_publish_total"

  (* Per-keeper turn outcome + token counters.  Labels are populated
     dynamically via inc_counter; no upfront registration needed.
     Covers issues #7495 (cost/token attribution) and #7519 (SLO). *)
  add metric_keeper_turns
    "Total keeper turns by outcome (labels: keeper_name, outcome=success|failure|budget_exhausted|mutation_boundary)"
    Counter;
  add metric_keeper_input_tokens
    "Cumulative input tokens per keeper turn (labels: keeper_name, model)"
    Counter;
  add metric_keeper_output_tokens
    "Cumulative output tokens per keeper turn (labels: keeper_name, model)"
    Counter;
  (* Anthropic / Bedrock prompt caching observability (#7469 Step 1).
     OAS already receives [cache_creation_input_tokens] and
     [cache_read_input_tokens] in every [api_usage]; these counters
     expose them to Prometheus so cache hit-rate and write cost are
     attributable per keeper + model. Populated dynamically via
     [inc_counter]; tools that never emit cache data (e.g. non-Anthropic
     providers) simply leave these at 0. Names are exported as module
     constants below so registration and call-sites cannot drift. *)
  add metric_keeper_cache_creation_tokens
    "Cumulative prompt-cache creation tokens per keeper turn (labels: keeper_name, model)"
    Counter;
  add metric_keeper_cache_read_tokens
    "Cumulative prompt-cache read tokens per keeper turn (labels: keeper_name, model)"
    Counter;
  (* Tool schema budget gauges — set once at boot via
     [set_tool_schema_stats]. Covers #7483 Step 1. *)
  add metric_mcp_tool_schema_count
    "Number of tool schemas exposed to MCP clients" Gauge;
  add metric_mcp_tool_schema_tokens_approx
    "Approximate token count of all tool schemas combined (chars/4)"
    Gauge;
  (* OAS Event_bus backpressure observability (see oas_bus_instrument.ml).
     Label series are populated dynamically per subscriber_purpose. *)
  add metric_oas_bus_subscriber_stream_depth
    "Estimated OAS Event_bus per-subscriber stream depth, labeled by \
     subscriber_purpose. Indirect measure: publishes_matching_filter - \
     events_drained, tracked MASC-side for subscriptions created via \
     Oas_bus_instrument. OAS uses bounded Eio.Stream (default 256); values \
     approaching this cap indicate impending publish blocking."
    Gauge;
  add metric_oas_bus_publish_block_seconds
    "Cumulative seconds spent inside Oas.Event_bus.publish when routed \
     through Oas_bus_instrument.publish. A sustained ramp indicates a \
     subscriber drain loop has fallen behind and publishers are blocking \
     on Eio.Stream.add."
    Counter;
  add metric_oas_bus_publish
    "Total Oas.Event_bus.publish calls routed through \
     Oas_bus_instrument.publish."
    Counter;
  (* Transport metrics — registered here so transport_metrics.ml can use
     module constants instead of string literals. *)
  add metric_sse_sessions "Active SSE sessions by kind" Gauge;
  register_histogram ~name:metric_sse_broadcast_duration
    ~help:"Time to fan-out a broadcast to all SSE clients" ();
  add metric_sse_broadcast_events "Total SSE broadcast events emitted" Counter;
  add metric_sse_stream_queue_depth
    "Per-session SSE event stream queue depth" Gauge;
  add metric_sse_queue_depth_avg
    "Average SSE event queue depth across live sessions" Gauge;
  add metric_sse_queue_depth_max
    "Maximum SSE event queue depth across live sessions" Gauge;
  add metric_sse_external_subscribers
    "Active non-SSE subscribers bridged from the SSE fanout path" Gauge;
  add metric_grpc_active_streams "Active gRPC bidirectional streams" Gauge;
  register_histogram ~name:metric_grpc_heartbeat_latency
    ~help:"gRPC heartbeat round-trip latency" ();
  add metric_grpc_subscribers "Active gRPC Subscribe stream subscribers" Gauge;
  add metric_grpc_events_delivered "Total events delivered via gRPC streams" Counter;
  add metric_ws_sessions "Active standalone WebSocket sessions" Gauge

let start_time = Time_compat.now ()

let update_uptime () =
  set_gauge metric_uptime_seconds (Time_compat.now () -. start_time)

let fd_warn_threshold =
  Env_config_core.get_int ~default:3000 "MASC_FD_WARN_THRESHOLD" |> max 1

let () = set_gauge metric_fd_warn_threshold (float_of_int fd_warn_threshold)

let fd_warned_once = ref false

(** Returns 0 on non-Unix hosts where [/dev/fd] is unavailable. *)
let approximate_open_fd_count () =
  let candidates = ["/dev/fd"; "/proc/self/fd"] in
  let rec first_readable = function
    | [] -> None
    | path :: rest ->
        (try Some (path, Sys.readdir path)
         with
         | Eio.Cancel.Cancelled _ as e -> raise e
         | _exn -> first_readable rest)
  in
  match first_readable candidates with
  | None -> 0
  | Some (_path, entries) ->
      max 0 (Array.length entries - 1)

let update_fd_gauges () =
  let count = approximate_open_fd_count () in
  set_gauge metric_open_fds (float_of_int count);
  if count >= fd_warn_threshold && not !fd_warned_once then begin
    fd_warned_once := true;
    Printf.eprintf
      "[WARN] [Server] process open fd count %d has reached warn \
       threshold %d — likely socket/file leak, investigate before \
       accept() starts failing with EMFILE.\n%!"
      count fd_warn_threshold
  end else if count < fd_warn_threshold / 2 then
    fd_warned_once := false

let set_tool_schema_stats ~count ~approx_tokens =
  set_gauge metric_mcp_tool_schema_count (float_of_int count);
  set_gauge metric_mcp_tool_schema_tokens_approx (float_of_int approx_tokens)

(** {1 Prometheus Export} *)

let type_to_string = function
  | Counter -> "counter"
  | Gauge -> "gauge"
  | Histogram -> "histogram"

let labels_to_string = function
  | [] -> ""
  | labels ->
      let pairs = List.map (fun (k, v) ->
        Printf.sprintf "%s=\"%s\"" k (String.escaped v)
      ) labels in
      "{" ^ String.concat "," pairs ^ "}"

let to_prometheus_text () =
  update_uptime ();
  update_fd_gauges ();
  (* Snapshot (name, help, metric_type, value, labels) under the mutex so
     the render phase sees a consistent view even when concurrent fibers
     are still updating [metrics].  [m.value] is mutable so we copy it
     here rather than holding the lock for the full render. *)
  let snapshot =
    with_lock (fun () ->
      Hashtbl.fold
        (fun _ (m : metric) acc ->
          { name = m.name;
            help = m.help;
            metric_type = m.metric_type;
            value = m.value;
            labels = m.labels;
          } :: acc)
        metrics [])
  in
  let buf = Buffer.create 1024 in
  let by_name = Hashtbl.create 32 in
  List.iter (fun (m : metric) ->
    let existing = Hashtbl.find_opt by_name m.name |> Option.value ~default:[] in
    Hashtbl.replace by_name m.name (m :: existing)
  ) snapshot;
  (* Collect histogram parent names.  observe_histogram stores the
     cumulative sum under the original name and the observation count
     under "<name>_count".  We suppress standalone export of the
     _count companion and instead emit it inline as part of the
     summary stanza for the parent. *)
  let histogram_parents = Hashtbl.create 8 in
  Hashtbl.iter (fun name ms ->
    List.iter (fun (m : metric) ->
      if m.metric_type = Histogram then
        Hashtbl.replace histogram_parents name true
    ) ms
  ) by_name;
  let label_key labels =
    List.fold_left (fun acc (k, v) -> acc ^ k ^ v) "" labels
  in
  Hashtbl.iter (fun name ms ->
    let is_histogram_count =
      let suf = "_count" in
      let slen = String.length suf in
      String.length name > slen
      && String.sub name (String.length name - slen) slen = suf
      && Hashtbl.mem histogram_parents
           (String.sub name 0 (String.length name - slen))
    in
    if is_histogram_count then ()
    else
    match ms with
    | [] -> ()
    | m :: _ ->
      Buffer.add_string buf (Printf.sprintf "# HELP %s %s\n" name m.help);
      (match m.metric_type with
       | Histogram ->
         (* No bucket distribution is tracked, so emit as summary
            (sum + count) which is the closest valid Prometheus type. *)
         Buffer.add_string buf (Printf.sprintf "# TYPE %s summary\n" name);
         List.iter (fun (metric : metric) ->
           let ls = labels_to_string metric.labels in
           Buffer.add_string buf
             (Printf.sprintf "%s_sum%s %g\n" name ls metric.value);
           let count_key = name ^ "_count" ^ label_key metric.labels in
           let count_val =
             with_lock (fun () ->
               match Hashtbl.find_opt metrics count_key with
               | Some cm -> cm.value
               | None -> 0.0)
           in
           Buffer.add_string buf
             (Printf.sprintf "%s_count%s %g\n" name ls count_val)
         ) ms
       | _ ->
         Buffer.add_string buf
           (Printf.sprintf "# TYPE %s %s\n" name (type_to_string m.metric_type));
         List.iter (fun (metric : metric) ->
           Buffer.add_string buf (Printf.sprintf "%s%s %g\n"
             metric.name (labels_to_string metric.labels) metric.value)
         ) ms)
  ) by_name;
  Buffer.contents buf

(** {1 Convenience Functions} *)

let record_request () =
  inc_counter metric_mcp_requests ()

let record_task_completed () =
  inc_counter metric_tasks ~labels:[("status", "completed")] ()

let record_task_failed () =
  inc_counter metric_tasks ~labels:[("status", "failed")] ()

let record_error ?(error_type="unknown") () =
  inc_counter metric_errors ~labels:[("type", error_type)] ()

let set_active_agents count =
  set_gauge metric_active_agents (float_of_int count)

let set_pending_tasks count =
  set_gauge "masc_pending_tasks" (float_of_int count)

(** Reconcile active_agents gauge with existing agent files on disk.
    Call after Coord/server initialization to sync Prometheus state. *)
let reconcile_active_agents_gauge masc_dir =
  let agents_dir = Filename.concat masc_dir "agents" in
  if Sys.file_exists agents_dir && Sys.is_directory agents_dir then
    let files = Sys.readdir agents_dir in
    let count = Array.fold_left (fun acc f ->
      if Filename.check_suffix f ".json" then acc + 1 else acc
    ) 0 files in
    set_active_agents count

(** Initialize on module load *)
let () = init ()
