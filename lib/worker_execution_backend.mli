(** Worker_execution_backend — local vs docker execution backend.

    @since 0.1.0 *)

type t = Local | Docker

val to_string : t -> string
val of_string : string -> t option
val to_yojson : t -> Yojson.Safe.t
val of_yojson : Yojson.Safe.t -> (t, string) result
