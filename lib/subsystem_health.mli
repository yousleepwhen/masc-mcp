(** Subsystem_health — forked subsystem health registry.

    Tracks which forked subsystems are alive or have crashed.
    Thread-safe via Stdlib.Mutex for cross-domain access.

    @since 0.1.0 *)

val register : string -> unit
val mark_dead : string -> unit
val to_yojson : unit -> Yojson.Safe.t
