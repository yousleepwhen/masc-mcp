(** Meta_cognition_interpret — interpretation of meta-cognition summaries.

    Derives actionable signals from belief/tension/desire summaries.
    Used internally by meta_cognition module cluster.

    @since 0.1.0 *)

open Meta_cognition_types

val summary_signature : summary_input -> string
val interpret : summary_input -> interpretation
val interpretation_to_json : interpretation -> Yojson.Safe.t
val salience_list_to_json : salience list -> Yojson.Safe.t
