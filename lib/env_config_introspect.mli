(** Env_config_introspect — root-level config introspection wrapper.

    Adds root-runtime metadata to [Env_config_snapshot] for server-level
    config inspection.

    @since 0.1.0 *)

val server_meta : unit -> Yojson.Safe.t
val to_json : unit -> Yojson.Safe.t
val to_json_filtered : ?cat:string -> unit -> Yojson.Safe.t
