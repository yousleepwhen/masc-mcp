(** Coord_goals — goal management tool dispatch.

    Handles goal list, review, and upsert operations via Coord.

    @since 0.1.0 *)

val handle_goal_list : Coord_types.context -> Yojson.Safe.t -> bool * string
val handle_goal_review : Coord_types.context -> Yojson.Safe.t -> bool * string
val handle_goal_upsert : Coord_types.context -> Yojson.Safe.t -> bool * string
