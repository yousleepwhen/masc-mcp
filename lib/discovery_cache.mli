(** Discovery_cache — cached wrapper over OAS Provider Discovery.

    Adds TTL-based caching (30s default), convenience queries,
    and Eio capability injection on top of OAS discovery.

    @since 2.130.0 *)

type endpoint_info = Llm_provider.Discovery.endpoint_status

val set_env :
  sw:Eio.Switch.t ->
  net:([ `Generic | `Unix ] Eio.Net.ty Eio.Resource.t) ->
  unit
val set_base_path : string -> unit
val get_cached_or_refresh : unit -> endpoint_info list
val cache_age_seconds : unit -> float
val any_local_healthy : unit -> bool
val idle_slot_count : unit -> int
val busy_slot_count : unit -> int
val endpoint_to_json : endpoint_info -> Yojson.Safe.t
