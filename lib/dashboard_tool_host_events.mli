(** Dashboard_tool_host_events — tool host event recording.

    Records tool invocation events from dashboard/host interactions
    to JSONL for audit and observability.

    @since 0.1.0 *)

type report = {
  agent_name : string;
  client_name : string;
  tool_name : string;
  transport : string;
  phase : string option;
  message : string;
  request_id : string option;
  session_id : string option;
  trace_id : string option;
  timeout_ms : int option;
}

val report_of_yojson : ?fallback_agent:string -> Yojson.Safe.t -> report
val record : ?fs:Coord.config -> Coord.config -> report -> unit
