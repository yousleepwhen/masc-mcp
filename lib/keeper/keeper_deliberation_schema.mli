(** Keeper_deliberation_schema — Task schema integration for keeper deliberation.

    Bridges keeper_deliberation actions with the unified tool_task schema,
    enabling deterministic validation and round-trip consistency.

    @since 3.0.0 *)

(** {1 Schema-aligned task context} *)

(** Task context for deliberation — includes keeper identity + task metadata *)
type task_context = {
  task_id: string;
  keeper_name: string;
  task_type: string;  (** e.g., "claim", "release", "report" *)
  schema_version: string;  (** e.g., "3.0" *)
}

(** Build task context from components *)
val build_task_context : task_id:string -> keeper_name:string -> task_type:string -> task_context

(** {1 Schema validation} *)

(** Result of schema validation *)
type validation_result =
  | Valid
  | Invalid of string  (** error message *)

(** Validate deliberation action against task schema *)
val validate_action : task_ctx:task_context -> Keeper_deliberation.deliberation_action -> validation_result

(** Verify action serializes and deserializes consistently *)
val validate_round_trip : Keeper_deliberation.deliberation_action -> validation_result

(** {1 Task-aware deliberation state} *)

(** Enhanced deliberation state tracking *)
type deliberation_state = {
  task_context: task_context;
  last_action: Keeper_deliberation.deliberation_action option;
  validation_status: validation_result;
  schema_compliant: bool;
}

(** Initialize deliberation state for a task *)
val init_state : task_context:task_context -> deliberation_state

(** Update state after action execution *)
val update_state_after_action : deliberation_state -> Keeper_deliberation.deliberation_action -> deliberation_state

(** {1 JSON serialization with schema info} *)

(** Serialize deliberation state to JSON with schema metadata *)
val state_to_json : deliberation_state -> Yojson.Safe.t
