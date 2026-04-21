(** Coord_status_rendering — status summary rendering for dashboard.

    @since 0.1.0 *)

val status_summary_string : Coord.config -> string
val active_task_assignee : Coord.config -> string option
val assigned_task_ids : Coord.config -> string list
val deliverable_claims_completion : Coord.config -> float
