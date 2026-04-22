(** Transport_read_model — transport status read model.

    Provides HTTP/WebSocket transport status for dashboard and probes.

    @since 0.1.0 *)

type http_context = {
  base_url : string;
  host : string;
  allow_legacy_accept : bool;
  include_configured : bool;
}

val context_from_env :
  ?include_configured:bool -> allow_legacy_accept:bool -> unit -> http_context
val make_http_context :
  ?include_configured:bool ->
  base_url:string -> host:string ->
  allow_legacy_accept:bool -> unit -> http_context
val normalize_advertised_host : string -> string
val transport_status_json : http_context -> Yojson.Safe.t
val websocket_discovery_json : http_context -> Yojson.Safe.t
