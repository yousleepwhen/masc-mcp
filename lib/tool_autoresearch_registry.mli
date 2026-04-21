(** Tool_autoresearch_registry — loop registry and code generator state.

    Manages active autoresearch loops, pending hypothesis injections,
    and custom code generator overrides.

    @since 0.1.0 *)

(** {1 Loop Registry} *)

val active_loops : (string, Autoresearch.loop_state) Hashtbl.t
val latest_loop_id : string option ref

(** {1 Hypothesis Injection} *)

val pending_hypotheses : (string, string) Hashtbl.t

(** {1 Code Generator} *)

type code_generator =
  goal:string ->
  baseline:float ->
  lower_is_better:bool ->
  history:Autoresearch.cycle_record list ->
  insights:string list ->
  target_file:string ->
  file_content:string ->
  (string * string, string) Stdlib.result

val custom_generators : (string, code_generator) Hashtbl.t
val set_generator : string -> code_generator -> unit
val get_generator : string -> code_generator
