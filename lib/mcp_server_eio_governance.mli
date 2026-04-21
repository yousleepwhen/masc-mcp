(** Mcp_server_eio_governance — governance configuration and MCP session helpers.

    Extracted from mcp_server_eio.ml to reduce file size and
    enable reuse from Tool_inline_dispatch.

    @since 0.1.0 *)

(** {1 Governance} *)

type governance_config = {
  level : string;
  audit_enabled : bool;
  anomaly_detection : bool;
}

val governance_defaults : string -> governance_config
val governance_path : Coord.config -> string
val load_governance : Coord.config -> governance_config
val save_governance : Coord.config -> governance_config -> unit

(** {1 MCP Sessions} *)

type mcp_session_record = {
  id : string;
  agent_name : string option;
  created_at : float;
  last_seen : float;
}

val mcp_session_to_json : mcp_session_record -> Yojson.Safe.t
val mcp_session_of_json : Yojson.Safe.t -> mcp_session_record option
val load_mcp_sessions : Coord.config -> mcp_session_record list
val save_mcp_sessions : Coord.config -> mcp_session_record list -> unit
