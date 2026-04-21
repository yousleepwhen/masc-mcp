(** Tool_autoresearch_broadcast — SSE broadcast for autoresearch events.

    @since 0.1.0 *)

val broadcast_cycle_result :
  Autoresearch.loop_state -> Autoresearch.cycle_record -> unit

val broadcast_loop_lifecycle :
  string -> Autoresearch.loop_state -> unit
