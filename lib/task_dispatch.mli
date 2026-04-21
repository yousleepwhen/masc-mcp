(** Task_dispatch — runtime backend selection for MASC tasks.

    JSONL (Coord.*) backend only.

    @since 0.7.0 *)

open Types

type task_backend =
  | Jsonl

type backend_state =
  | Uninitialized
  | Active of task_backend

val backend_state : backend_state ref
val is_initialized : unit -> bool
val init_jsonl : unit -> unit
val reset_for_test : unit -> unit
val backend : unit -> task_backend
val add_task : Coord.config -> title:string -> priority:string -> description:string -> task
val get_task : Coord.config -> task_id:string -> task option
val list_tasks :
  Coord.config -> ?include_done:bool -> ?include_cancelled:bool -> unit -> task list
val validate_transition :
  current:task_status -> next:task_status -> task_id:string -> (unit, string) result
val update_status : Coord.config -> task_id:string -> status:task_status -> (task, string) result
val delete_task : Coord.config -> task_id:string -> unit
