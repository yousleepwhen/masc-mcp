(** Board_votes — voting direction helpers for board tool.

    Provides vote direction type and string conversion.

    @since 0.1.0 *)

(** {1 Types} *)

type vote_direction =
  | Up
  | Down

(** {1 Conversion} *)

val vote_direction_to_string : vote_direction -> string
val valid_vote_direction_strings : string list
