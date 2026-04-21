(** Board_core_payload — state block extraction and post payload normalization.

    Handles [STATE]...[/STATE] block parsing, title derivation,
    and content normalization before persistence.

    @since 0.1.0 *)

val state_start_marker : string
val state_end_marker : string
val extract_state_block : string -> string option * string
val meta_state_block : Yojson.Safe.t option -> string option
val merge_meta_json :
  ?state_block:string -> Yojson.Safe.t option -> Yojson.Safe.t option
val derive_post_title : string -> String_util.utf8_safe
val normalize_post_payload :
  content:string ->
  ?title:string -> ?body:string ->
  post_kind:Board.post_kind ->
  ?meta_json:Yojson.Safe.t option ->
  unit -> string * string * Board.post_kind * Yojson.Safe.t option
