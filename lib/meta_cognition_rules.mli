(** Meta_cognition_rules — rule engines for meta-cognition classification.

    @since 0.1.0 *)

val classify_interaction_text : string -> string
val belief_rules : unit -> string list
val tension_rules : unit -> string list
val desire_rules : unit -> string list
val tool_block_support : string -> bool
val operator_need_support : string -> bool
