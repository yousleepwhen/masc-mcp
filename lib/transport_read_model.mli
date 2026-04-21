(** Transport_read_model — transport status read model.

    Provides HTTP/WebSocket transport status for dashboard and probes.

    @since 0.1.0 *)

type http_context = {
  base_url : string;
  host : string;
  allow_legacy_accept : bool;
  include_configured : bool;
}

val context_from_env : unit -> http_context option
val make_http_context :
  ?allow_legacy_accept:bool -> ?include_configured:bool ->
  string -> http_context
val normalize_advertised_host : string -> string
val transport_status_json : http_context -> Yojson.Safe.t
val websocket_discovery_json : unit -> Yojson.Safe.t
