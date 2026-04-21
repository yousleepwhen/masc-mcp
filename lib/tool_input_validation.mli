(** Tool_input_validation — pre-dispatch input validation hook.

    Registers an OAS Tool_middleware validation hook that catches
    missing required fields and type mismatches before tool dispatch.

    @since 0.1.0 *)

val register_pre_hook : unit -> unit
