(** Coord_goals — goal management tool dispatch.

    Handles goal list, review, and upsert operations via Coord.

    @since 0.1.0 *)

val handle_goal_list : Coord_types.context -> (bool * string) option
val handle_goal_review : Coord_types.context -> (bool * string) option
val handle_goal_upsert : Coord_types.context -> (bool * string) option
