(** Board_core_classify — post classification and visibility.

    @since 0.1.0 *)

type reclassify_report = {
  post_id : string;
  old_kind : Board.post_kind;
  new_kind : Board.post_kind;
  reason : string;
}

val post_kind_to_string : Board.post_kind -> string
val valid_visibility_strings : string list
val visibility_of_string : string -> Board.visibility option
