(** Shutdown_hooks — centralized graceful shutdown management.

    Registers cleanup functions called during graceful shutdown.

    @since 0.5.0 *)

val cancel_orchestrator_ref : (unit -> unit) option Atomic.t
val register_cancel_orchestrator : (unit -> unit) -> unit
val run_all : unit -> unit
