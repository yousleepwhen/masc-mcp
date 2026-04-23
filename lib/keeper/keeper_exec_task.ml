open Keeper_types
open Keeper_exec_shared

let active_goal_scope_suffix (meta : keeper_meta) =
  match meta.active_goal_ids with
  | [] -> ""
  | goal_ids ->
      Printf.sprintf " within active_goal_ids=[%s]" (String.concat ", " goal_ids)
;;

let task_in_active_goal_scope (meta : keeper_meta) (task : Types.task) =
  match meta.active_goal_ids with
  | [] -> true
  | goal_ids -> Keeper_runtime_contract.task_is_linked_to_keeper_goals goal_ids task
;;

let ensure_task_in_active_goal_scope
      ~(config : Coord.config)
      ~(meta : keeper_meta)
      ~(task_id : string)
  =
  match meta.active_goal_ids with
  | [] -> Ok ()
  | _ ->
      (match
         Coord.get_tasks_safe config
         |> List.find_opt (fun (task : Types.task) -> String.equal task.id task_id)
       with
       | None -> Ok ()
       | Some task when task_in_active_goal_scope meta task -> Ok ()
       | Some _ ->
           Error
             (Printf.sprintf
                "task %s is outside your active goal scope%s."
                task_id
                (active_goal_scope_suffix meta)))
;;

let filtered_keeper_tasks
      ~(meta : keeper_meta)
      ?status_filter
      ~(include_done : bool)
      (tasks : Types.task list)
  =
  tasks
  |> List.filter (task_in_active_goal_scope meta)
  |> List.filter (fun (task : Types.task) ->
    match status_filter with
    | Some status ->
        String.equal status (Types.string_of_task_status task.task_status)
    | None ->
        let status = task.task_status in
        let is_done = Types.task_status_is_done status in
        let is_cancelled =
          match status with
          | Types.Cancelled _ -> true
          | Types.Todo
          | Types.Claimed _
          | Types.InProgress _
          | Types.AwaitingVerification _
          | Types.Done _ -> false
        in
        (include_done || not is_done) && not is_cancelled)
;;

let keeper_tasks_list_message
      ~(meta : keeper_meta)
      ?status_filter
      ~(include_done : bool)
      ~(limit : int)
      (tasks : Types.task list)
  =
  let goal_scoped_tasks = List.filter (task_in_active_goal_scope meta) tasks in
  let visible_tasks =
    filtered_keeper_tasks ~meta ?status_filter ~include_done tasks
  in
  match visible_tasks with
  | [] ->
      let scope_suffix = active_goal_scope_suffix meta in
      if tasks = [] then
        "📋 No tasks. ACTION: STOP calling keeper_tasks_list — the backlog is empty. Move on to other work or end your turn."
      else if meta.active_goal_ids <> [] && goal_scoped_tasks = [] then
        Printf.sprintf
          "📋 No tasks%s. ACTION: STOP calling keeper_tasks_list — nothing is linked to your active goals. Move on to other work or end your turn."
          scope_suffix
      else
        Printf.sprintf
          "📋 No active tasks%s. ACTION: STOP calling keeper_tasks_list — do not re-check. Move on to other work or end your turn."
          scope_suffix
  | _ ->
      let sorted =
        visible_tasks
        |> List.sort (fun (a : Types.task) b -> compare a.priority b.priority)
        |> List.filteri (fun i _ -> i < limit)
      in
      let buf = Buffer.create 256 in
      Buffer.add_string buf "📋 Quest Board\n";
      Buffer.add_string buf "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
      List.iter
        (fun (task : Types.task) ->
           let status_icon = Types.task_status_icon task.task_status in
           let assignee = Types.task_display_assignee task.task_status in
           let status_str = Types.string_of_task_status task.task_status in
           Buffer.add_string buf
             (Printf.sprintf "%s [%d] %s: %s\n" status_icon task.priority task.id task.title);
           Buffer.add_string buf
             (Printf.sprintf "   └─ %s | %s\n" status_str assignee))
        sorted;
      Buffer.contents buf
;;

let keeper_task_result_json = function
  | Ok msg -> Yojson.Safe.to_string (`Assoc [ "ok", `Bool true; "result", `String msg ])
  | Error e ->
    Yojson.Safe.to_string
      (`Assoc [ "ok", `Bool false; "error", `String (Types.masc_error_to_string e) ])
;;

let keeper_tool_result_json ~(ok : bool) ~(message : string) =
  Yojson.Safe.to_string
    (`Assoc
       [
         "ok", `Bool ok;
         ((if ok then "result" else "error"), `String message);
       ])
;;

let handle_keeper_task_tool
      ~(config : Coord.config)
      ~(meta : keeper_meta)
      ~(name : string)
      ~(args : Yojson.Safe.t)
  =
  match name with
  | "keeper_tasks_list" ->
    let status_filter = Safe_ops.json_string_opt "status" args in
    let include_done = Safe_ops.json_bool ~default:false "include_done" args in
    let limit = Safe_ops.json_int ~default:50 "limit" args |> max 1 |> min 100 in
    keeper_tasks_list_message
      ~meta
      ?status_filter
      ~include_done
      ~limit
      (Coord.get_tasks_safe config)
  | "keeper_tasks_audit" ->
    let limit = Safe_ops.json_int ~default:20 "limit" args |> max 1 |> min 50 in
    let orphans =
      Coord.audit_orphan_tasks config
      |> List.filter (fun (task, _) -> task_in_active_goal_scope meta task)
    in
    let orphans = List.filteri (fun i _ -> i < limit) orphans in
    let items =
      List.map
        (fun (task, assignee) ->
           let task : Types.task = task in
           `Assoc
             [ "task_id", `String task.id
             ; "title", `String task.title
             ; "assignee", `String assignee
             ; "status", `String (Types.string_of_task_status task.task_status)
             ])
        orphans
    in
    let action_hint =
      if orphans = [] then
        if meta.active_goal_ids = [] then
          "ACTION: STOP calling keeper_tasks_audit — no orphans found. Move on to other work or end your turn."
        else
          Printf.sprintf
            "ACTION: STOP calling keeper_tasks_audit — no scoped orphans found%s. Move on to other work or end your turn."
            (active_goal_scope_suffix meta)
      else
        Printf.sprintf "ACTION: %d orphan(s) found. Use keeper_task_force_release or keeper_task_force_done to resolve, then STOP re-auditing."
          (List.length orphans)
    in
    Yojson.Safe.to_string
      (`Assoc [ "orphan_count", `Int (List.length orphans); "orphans", `List items;
                "action", `String action_hint ])
  | "keeper_task_force_release" ->
    let task_id = Safe_ops.json_string ~default:"" "task_id" args |> String.trim in
    let reason = Safe_ops.json_string ~default:"" "reason" args in
    if task_id = ""
    then error_json "task_id is required. Use the task_id from keeper_tasks_list or keeper_tasks_audit."
    else (
      match ensure_task_in_active_goal_scope ~config ~meta ~task_id with
      | Error msg -> error_json msg
      | Ok () ->
        let agent = keeper_agent_sender ~meta in
        let _ =
          Coord.broadcast
            config
            ~from_agent:agent
            ~content:
              (Printf.sprintf
                 "Force-releasing task %s (reason: %s)"
                 task_id
                 (if reason = "" then "no reason given" else reason))
        in
        keeper_task_result_json
          (Coord.force_release_task_r config ~agent_name:agent ~task_id ()))
  | "keeper_task_force_done" ->
    let task_id = Safe_ops.json_string ~default:"" "task_id" args |> String.trim in
    let notes = Safe_ops.json_string ~default:"" "notes" args in
    if task_id = ""
    then error_json "task_id is required. Use the task_id from keeper_tasks_list or keeper_tasks_audit."
    else (
      match ensure_task_in_active_goal_scope ~config ~meta ~task_id with
      | Error msg -> error_json msg
      | Ok () ->
        keeper_task_result_json
          (Coord.force_done_task_r
             config
             ~agent_name:(keeper_agent_sender ~meta)
             ~task_id
             ~notes
             ()))
  | "keeper_broadcast" ->
    let message = Safe_ops.json_string ~default:"" "message" args |> String.trim in
    if message = ""
    then error_json "message is required. Good: message='Build complete, all tests pass.'."
    else (
      let _ =
        Coord.broadcast config ~from_agent:(keeper_agent_sender ~meta) ~content:message
      in
      Yojson.Safe.to_string (`Assoc [ "ok", `Bool true; "broadcast", `String message ]))
  | "keeper_task_create" ->
    let title = Safe_ops.json_string ~default:"" "title" args |> String.trim in
    let description = Safe_ops.json_string ~default:"" "description" args |> String.trim in
    let priority = Safe_ops.json_int ~default:3 "priority" args |> max 1 |> min 5 in
    let goal_id =
      match Safe_ops.json_string_opt "goal_id" args with
      | Some s when String.trim s <> "" -> Some (String.trim s)
      | _ -> None
    in
    if title = ""
    then error_json "title is required. Provide a clear, actionable task title."
    else if description = ""
    then error_json "description is required. Explain what needs to be done and why."
    else (
      let result =
        Coord_task.add_task ?goal_id config ~title ~priority ~description
      in
      Yojson.Safe.to_string (`Assoc [ "ok", `Bool true; "result", `String result ]))
  | "keeper_task_claim" ->
    let preset_name =
      match Keeper_types.tool_access_preset meta.tool_access with
      | Some p -> Some (Keeper_types.tool_preset_to_string p)
      | None -> None
    in
    let task_filter (task : Types.task) =
      task_in_active_goal_scope meta task
      &&
      match task.required_preset, preset_name with
      | None, _ -> true
      | Some _required, None -> false  (* agent without preset cannot claim preset-required task *)
      | Some required, Some preset ->
        Keeper_tool_policy.preset_can_satisfy ~agent_preset:preset ~required_preset:required
    in
    let result = Coord.claim_next_r config ~agent_name:meta.agent_name ~task_filter () in
    let accountability_warning =
      if
        Keeper_accountability.accountability_risk_is_high config
          ~keeper_name:meta.name ~agent_name:meta.agent_name
      then
        Some
          "⚠ Accountability risk is high for this keeper. Prefer manual review or lower-risk routing when equivalent."
      else
        None
    in
    let message = match result with
      | Coord.Claim_next_claimed { message; _ } -> message
      | Coord.Claim_next_no_unclaimed -> "📋 No unclaimed tasks. ACTION: Stop task-checking — nothing to claim."
      | Coord.Claim_next_no_eligible { preset_filtered; _ } when preset_filtered > 0 ->
        Printf.sprintf "📋 No eligible tasks (preset mismatch: %d tasks require different preset, you have '%s')"
          preset_filtered (Option.value ~default:"unknown" preset_name)
      | Coord.Claim_next_no_eligible { excluded_count; _ } ->
        Printf.sprintf
          "📋 No eligible tasks%s. ACTION: Stop task-checking — blocked/excluded=%d."
          (active_goal_scope_suffix meta)
          excluded_count
      | Coord.Claim_next_error e -> Printf.sprintf "❌ Error: %s" e
    in
    Yojson.Safe.to_string
      (`Assoc
         ([
            ("result", `String message);
          ]
         @
         match accountability_warning with
         | Some warning -> [ ("routing_warning", `String warning) ]
         | None -> []))
  | "keeper_task_done" ->
    let task_id = Safe_ops.json_string ~default:"" "task_id" args |> String.trim in
    let result_text = Safe_ops.json_string ~default:"" "result" args |> String.trim in
    if task_id = ""
    then error_json "task_id is required. Use the task_id you got from keeper_task_claim."
    else
      (match ensure_task_in_active_goal_scope ~config ~meta ~task_id with
       | Error msg -> error_json msg
       | Ok () ->
         let ok, message =
           Tool_task.handle_transition
             {
               Tool_task.config;
               agent_name = keeper_agent_sender ~meta;
               sw = Eio_context.get_switch_opt ();
             }
             (`Assoc
                [
                  "task_id", `String task_id;
                  "action", `String "done";
                  "notes", `String result_text;
                ])
         in
         keeper_tool_result_json ~ok ~message)
  | "keeper_task_submit_for_verification" ->
    let task_id = Safe_ops.json_string ~default:"" "task_id" args |> String.trim in
    let notes = Safe_ops.json_string ~default:"" "notes" args |> String.trim in
    let pr_url = Safe_ops.json_string ~default:"" "pr_url" args |> String.trim in
    if task_id = ""
    then error_json "task_id is required. Use the task_id you got from keeper_task_claim."
    else if notes = ""
    then error_json "notes is required. Include verification evidence and test summary."
    else if pr_url = ""
    then error_json "pr_url is required. Include the PR opened for this task."
    else
      (match ensure_task_in_active_goal_scope ~config ~meta ~task_id with
       | Error msg -> error_json msg
       | Ok () ->
         let ok, message =
           Tool_task.handle_transition
             {
               Tool_task.config;
               agent_name = keeper_agent_sender ~meta;
               sw = Eio_context.get_switch_opt ();
             }
             (`Assoc
                [
                  "task_id", `String task_id;
                  "action", `String "submit_for_verification";
                  "notes", `String (notes ^ "\nPR: " ^ pr_url);
                ])
         in
         keeper_tool_result_json ~ok ~message)
  | other -> error_json ~fields:[ "tool", `String other ] "unknown_task_tool"
;;
