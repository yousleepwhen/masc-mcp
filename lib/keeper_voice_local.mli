(** Keeper_voice_local — local voice session management for keepers.

    Singleton Voice_session_manager backed by local filesystem.
    TTS still uses direct HTTP endpoints.

    @since 2.95.0 *)

val trim_opt : string option -> string option
val resolved_base_path_opt : unit -> string option
val masc_base_dir : unit -> string
val get_session_manager : unit -> Voice_session_manager.t
