(** Mcp_server_eio_helpers — utility functions for MCP server EIO.

    Extracted to avoid circular dependencies between mcp_server_eio
    and tool_inline_dispatch.

    @since 0.1.0 *)

val log_mcp_exn : label:string -> exn -> unit
val wait_for_message_eio :
  clock:float Eio.Time.clock_ty Eio.Resource.t ->
  Session.registry ->
  agent_name:string ->
  timeout:float ->
  Yojson.Safe.t option
