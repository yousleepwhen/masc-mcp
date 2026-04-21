(** Masc_error_recovery — error recovery hints for self-correction.

    Pattern-matches error messages to suggest recovery actions.

    @since 0.1.0 *)

val contains : string -> string -> bool
val recovery_hint : string -> string option
