(** Meta_cognition_digest — board digest management.

    Manages meta-cognition digest posts on the board with
    signature-based deduplication and latest-digest lookup.

    @since 0.1.0 *)

open Meta_cognition_types

val digest_hearth : string
val digest_source : string
val post_digest_key : Board.post -> string option
val latest_digest_ref : ?summary:summary_input -> unit -> digest_ref option
val latest_digest_json : ?summary:summary_input -> unit -> Yojson.Safe.t
