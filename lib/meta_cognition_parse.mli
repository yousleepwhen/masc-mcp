(** Meta_cognition_parse — JSON parsing for meta-cognition summaries.

    Parses belief/tension/desire summaries from JSON.
    Internal to meta_cognition module cluster.

    @since 0.1.0 *)

open Meta_cognition_types

val parse_summary : Yojson.Safe.t -> summary_input
val parse_belief_summary : Yojson.Safe.t -> belief_summary
val parse_tension_summary : Yojson.Safe.t -> tension_summary
val parse_desire_summary : Yojson.Safe.t -> desire_summary
