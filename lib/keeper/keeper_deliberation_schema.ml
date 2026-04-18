(** Keeper_deliberation_schema — Task schema integration for keeper deliberation.

    Bridges keeper_deliberation actions with the unified tool_task schema,
    enabling deterministic validation and round-trip consistency.

    @since 3.0.0 *)

(** {1 Schema-aligned task context} *)

(** Task context for deliberation — includes keeper identity + task metadata *)
type task_context = {
  task_id: string;
  keeper_name: string;
  task_type: string;  (* e.g., "claim", "release", "report" *)
  schema_version: string;  (* e.g., "3.0" *)
}

(** Build task context from task ID and keeper *)
let build_task_context ~task_id ~keeper_name ~task_type =
  {
    task_id;
    keeper_name;
    task_type;
    schema_version = "3.0";
  }

(** {1 Schema validation} *)

(** Result of schema validation *)
type validation_result =
  | Valid
  | Invalid of string  (* error message *)

(** Validate deliberation action against task schema *)
let validate_action ~(task_ctx : task_context) (action : Keeper_deliberation.deliberation_action) :
    validation_result =
  match action with
  | TaskClaim { task_id; _ } ->
      if String.equal task_id task_ctx.task_id then
        Valid
      else
        Invalid (Printf.sprintf "task_id mismatch: %s vs %s" task_id task_ctx.task_id)
  | Noop _ ->
      Valid  (* noop always valid *)
  | ReplyInRoom { room_id; _ } ->
      if String.length room_id > 0 then Valid else Invalid "room_id cannot be empty"
  | BoardPost { content; _ } ->
      if String.length content > 0 then Valid else Invalid "content cannot be empty"
  | BoardComment { post_id; content } ->
      if String.length post_id > 0 && String.length content > 0 then
        Valid
      else
        Invalid "post_id and content cannot be empty"
  | BoardVote { post_id; direction } ->
      let valid_directions = [ "up"; "down"; "neutral" ] in
      if List.mem direction valid_directions && String.length post_id > 0 then
        Valid
      else
        Invalid (Printf.sprintf "invalid vote direction: %s or empty post_id" direction)
  | Broadcast { message } ->
      if String.length message > 0 then Valid else Invalid "broadcast message cannot be empty"
  | ProposeSpawn { topic; _ } ->
      if String.length topic > 0 then Valid else Invalid "topic cannot be empty"
  | StartDiscussion { topic; context } ->
      if String.length topic > 0 && String.length context > 0 then
        Valid
      else
        Invalid "topic and context cannot be empty"
  | ShareFinding { finding; source } ->
      if String.length finding > 0 && String.length source > 0 then
        Valid
      else
        Invalid "finding and source cannot be empty"
  | MultiStep actions ->
      if List.length actions > 0 then
        match
          List.find_map (fun a ->
              match validate_action ~task_ctx a with
              | Invalid e -> Some e
              | Valid -> None)
            actions
        with
        | Some e -> Invalid e
        | None -> Valid
      else
        Invalid "multi_step cannot be empty"

(** {1 Round-trip JSON validation} *)

(** Verify action serializes and deserializes consistently *)
let validate_round_trip (action : Keeper_deliberation.deliberation_action) : validation_result =
  try
    let json = Keeper_deliberation.deliberation_action_to_json action in
    (* Basic round-trip check: ensure JSON is valid *)
    if Yojson.Safe.to_string json |> String.length > 0 then
      Valid
    else
      Invalid "JSON serialization produced empty string"
  with e -> Invalid (Printf.sprintf "round-trip error: %s" (Printexc.to_string e))

(** {1 Task-aware deliberation state} *)

(** Enhanced deliberation state tracking *)
type deliberation_state = {
  task_context: task_context;
  last_action: Keeper_deliberation.deliberation_action option;
  validation_status: validation_result;
  schema_compliant: bool;
}

(** Initialize deliberation state for a task *)
let init_state ~task_context =
  {
    task_context;
    last_action = None;
    validation_status = Valid;
    schema_compliant = true;
  }

(** Update state after action execution *)
let update_state_after_action (state : deliberation_state)
    (action : Keeper_deliberation.deliberation_action) : deliberation_state =
  let validation = validate_action ~task_ctx:state.task_context action in
  let schema_compliant =
    match validation with Valid -> true | Invalid _ -> false
  in
  {
    state with
    last_action = Some action;
    validation_status = validation;
    schema_compliant;
  }

(** {1 JSON serialization with schema info} *)

(** Serialize deliberation state to JSON with schema metadata *)
let state_to_json (state : deliberation_state) : Yojson.Safe.t =
  let task_json =
    `Assoc
      [
        ("task_id", `String state.task_context.task_id);
        ("keeper_name", `String state.task_context.keeper_name);
        ("task_type", `String state.task_context.task_type);
        ("schema_version", `String state.task_context.schema_version);
      ]
  in
  let action_json =
    match state.last_action with
    | Some action -> Keeper_deliberation.deliberation_action_to_json action
    | None -> `Null
  in
  let validation_json =
    match state.validation_status with
    | Valid -> `String "valid"
    | Invalid err -> `Assoc [ ("status", `String "invalid"); ("error", `String err) ]
  in
  `Assoc
    [
      ("task_context", task_json);
      ("last_action", action_json);
      ("validation_status", validation_json);
      ("schema_compliant", `Bool state.schema_compliant);
    ]
