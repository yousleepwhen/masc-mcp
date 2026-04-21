(** Tool_inline_dispatch_extra — extra inline tool dispatch handlers.

    @since 0.1.0 *)

val dispatch :
  Coord_types.context -> name:string -> args:Yojson.Safe.t ->
  (bool * string) option
