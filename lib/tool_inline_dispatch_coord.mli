(** Tool_inline_dispatch_coord — coordination tool dispatch handlers.

    @since 0.1.0 *)

val handle_join : Coord_types.context -> (bool * string) option
val handle_leave : Coord_types.context -> (bool * string) option
val handle_start : Coord_types.context -> (bool * string) option
