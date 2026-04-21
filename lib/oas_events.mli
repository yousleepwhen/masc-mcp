(** Oas_events — keeper lifecycle and snapshot event publishing.

    @since 0.1.0 *)

val publish_keeper_lifecycle :
  agent_name:string -> event:string -> ?metadata:Yojson.Safe.t -> unit -> unit
val publish_keeper_snapshot :
  agent_name:string -> Yojson.Safe.t -> unit
