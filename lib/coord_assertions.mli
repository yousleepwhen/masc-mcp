(** Coord_assertions — state inspection and assertion-based verification.

    @since 0.1.0 *)

open Types
open Coord_types

type agent_state = {
  room_set : bool;
  joined : bool;
  task_claimed : bool;
  current_task_set : bool;
  worktree_active : bool;
}

type assertion_kind =
  | Room_set
  | Joined
  | Task_claimed
  | Current_task_set
  | Worktree_active

val assertion_kind_to_string : assertion_kind -> string
val all_assertion_kinds : assertion_kind list
val valid_assertion_strings : string list
val assertion_kind_of_string_lenient : string -> assertion_kind option
val assertion_fix_hint : assertion_kind -> string
val room_set : Coord.config -> bool
val handle_check :
  Coord.config -> agent_name:string -> string list -> (agent_state, string) result
