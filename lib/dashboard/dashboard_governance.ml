(** Dashboard Governance — governance_v2 read model plus live judge status. *)

open Dashboard_utils

type detail_status = [ `OK | `Not_found ]

type case_projection = {
  id : string;
  status : string;
  last_activity_ts : float option;
  item_json : Yojson.Safe.t;
  case_json : Yojson.Safe.t;
  bundle_json : Yojson.Safe.t;
}

let option_to_yojson = Json_util.option_to_yojson

let case_tracking_note =
  "Governance case tracking is available as a read-only ledger; dashboard case mutations remain retired."

let case_write_note =
  "Dashboard governance case mutations are retired. Use this surface to inspect case history, rulings, and execution context."

let governance_surface_fields =
  [
    ("case_tracking_available", `Bool true);
    ("case_write_available", `Bool false);
    ("note", `String case_tracking_note);
    ("case_write_note", `String case_write_note);
  ]

let string_option_json = option_to_yojson (fun value -> `String value)

let governance_v2_dir base_path =
  Filename.concat (Filename.concat base_path ".masc") "governance_v2"

let cases_dir base_path =
  Filename.concat (governance_v2_dir base_path) "cases"

let petitions_dir base_path =
  Filename.concat (governance_v2_dir base_path) "petitions"

let rulings_dir base_path =
  Filename.concat (governance_v2_dir base_path) "rulings"

let execution_orders_dir base_path =
  Filename.concat (governance_v2_dir base_path) "execution_orders"

let trim_opt = function
  | Some value ->
      let trimmed = String.trim value in
      if trimmed = "" then None else Some trimmed
  | None -> None

let json_member_opt key = Safe_ops.json_member_opt key

let json_timestamp_opt key json =
  match json_member_opt key json with
  | Some (`Float value) -> Some value
  | Some (`Int value) -> Some (float_of_int value)
  | Some (`Intlit value) -> Safe_ops.float_of_string_safe value
  | Some (`String value) -> (
      match parse_iso_opt (trim_opt (Some value)) with
      | Some ts -> Some ts
      | None -> Safe_ops.float_of_string_safe value)
  | _ -> None

let json_timestamp_string key json =
  match json_timestamp_opt key json with
  | Some ts -> `String (iso_of_unix ts)
  | None -> `Null

let read_json_objects dir =
  match Safe_ops.list_dir_safe dir with
  | Error _ -> []
  | Ok names ->
      names
      |> List.filter (fun name ->
             Filename.check_suffix name ".json"
             && not (String.starts_with ~prefix:"_" name))
      |> List.sort String.compare
      |> List.filter_map (fun name ->
             let path = Filename.concat dir name in
             match Safe_ops.read_json_file_safe path with
             | Ok json -> Some json
             | Error _ -> None)

let json_string key json =
  Safe_ops.json_string_opt key json |> trim_opt

let json_string_default ~default key json =
  match json_string key json with
  | Some value -> value
  | None -> default

let json_string_list key json =
  Safe_ops.json_string_list key json |> dedup_strings

let max_opt a b =
  match a, b with
  | Some x, Some y -> Some (max x y)
  | Some x, None | None, Some x -> Some x
  | None, None -> None

let latest_by_ts jsons ts_key =
  let ranked =
    jsons
    |> List.filter_map (fun json ->
           match json_timestamp_opt ts_key json with
           | Some ts -> Some (ts, json)
           | None -> None)
    |> List.sort (fun (ts_a, _) (ts_b, _) -> Float.compare ts_b ts_a)
  in
  match ranked with
  | (_, json) :: _ -> Some json
  | [] -> List.hd_opt jsons

let normalize_resolved_action json =
  match json with
  | `Assoc _ ->
      let action_kind =
        match json_string "action_kind" json with
        | Some value -> Some value
        | None -> json_string "action_type" json
      in
      let payload_preview =
        match json_member_opt "payload_preview" json with
        | Some value -> value
        | None -> (
            match json_member_opt "payload" json with
            | Some value -> value
            | None -> `Null)
      in
      `Assoc
        [
          ("action_kind", string_option_json action_kind);
          ("resolved_tool", string_option_json (json_string "resolved_tool" json));
          ("target_type", string_option_json (json_string "target_type" json));
          ("target_id", string_option_json (json_string "target_id" json));
          ("reason", string_option_json (json_string "reason" json));
          ("payload_preview", payload_preview);
        ]
  | _ -> `Null

let normalize_guardrail_state json =
  match json with
  | `Assoc _ ->
      `Assoc
        [
          ( "requires_human_gate",
            match Safe_ops.json_bool_opt "requires_human_gate" json with
            | Some value -> `Bool value
            | None -> `Null );
          ( "pending_confirm",
            match json_member_opt "pending_confirm" json with
            | Some value -> value
            | None -> `Null );
          ("pending_confirm_token", string_option_json (json_string "pending_confirm_token" json));
          ( "ready_to_execute",
            match Safe_ops.json_bool_opt "ready_to_execute" json with
            | Some value -> `Bool value
            | None -> `Null );
        ]
  | _ -> `Null

let normalize_executed_route json =
  match json with
  | `Assoc _ ->
      let tool_name =
        match json_string "tool_name" json with
        | Some value -> Some value
        | None -> json_string "delegated_tool" json
      in
      `Assoc
        [
          ("action_type", string_option_json (json_string "action_type" json));
          ("tool_name", string_option_json tool_name);
          ("confirmation_state", string_option_json (json_string "confirmation_state" json));
          ("created_at", json_timestamp_string "created_at" json);
        ]
  | _ -> `Null

let normalize_judgment json =
  `Assoc
    [
      ("judgment_id", string_option_json (json_string "judgment_id" json));
      ("target_kind", string_option_json (json_string "target_kind" json));
      ("target_id", string_option_json (json_string "target_id" json));
      ("status", string_option_json (json_string "status" json));
      ("summary", string_option_json (json_string "summary" json));
      ( "confidence",
        match Safe_ops.json_float_opt "confidence" json with
        | Some value -> `Float value
        | None -> `Null );
      ("generated_at", json_timestamp_string "generated_at" json);
      ("expires_at", json_timestamp_string "expires_at" json);
      ("model_used", string_option_json (json_string "model_used" json));
      ("keeper_name", string_option_json (json_string "keeper_name" json));
      ("evidence_refs", Json_util.json_string_list (json_string_list "evidence_refs" json));
      ( "recommended_action",
        match json_member_opt "recommended_action" json with
        | Some value -> normalize_resolved_action value
        | None -> `Null );
      ( "guardrail_state",
        match json_member_opt "guardrail_state" json with
        | Some value -> normalize_guardrail_state value
        | None -> `Null );
      ( "executed_route",
        match json_member_opt "executed_route" json with
        | Some value -> normalize_executed_route value
        | None -> `Null );
    ]

let normalize_execution_order json =
  `Assoc
    [
      ("id", string_option_json (json_string "id" json));
      ("case_id", string_option_json (json_string "case_id" json));
      ("status", string_option_json (json_string "status" json));
      ("risk_class", string_option_json (json_string "risk_class" json));
      ( "action_request",
        match json_member_opt "action_request" json with
        | Some value -> normalize_resolved_action value
        | None -> `Null );
      ("created_at", json_timestamp_string "created_at" json);
      ("updated_at", json_timestamp_string "updated_at" json);
      ("execution_ref", string_option_json (json_string "execution_ref" json));
      ("result_summary", string_option_json (json_string "result_summary" json));
      ("actor", string_option_json (json_string "actor" json));
    ]

let normalize_case_brief ~case_id ~index json =
  let id =
    match json_string "id" json with
    | Some value -> value
    | None -> Printf.sprintf "%s:brief:%d" case_id index
  in
  let author =
    match json_string "author" json with
    | Some value -> value
    | None -> (
        match json_string "created_by" json with
        | Some value -> value
        | None -> "system")
  in
  let stance = json_string_default ~default:"neutral" "stance" json in
  let summary =
    match json_string "summary" json with
    | Some value -> value
    | None -> json_string_default ~default:"(no summary)" "content" json
  in
  `Assoc
    [
      ("id", `String id);
      ("author", `String author);
      ("stance", `String stance);
      ("summary", `String summary);
      ("evidence_refs", Json_util.json_string_list (json_string_list "evidence_refs" json));
      ("created_at", json_timestamp_string "created_at" json);
    ]

let normalize_petition json =
  `Assoc
    [
      ("id", string_option_json (json_string "id" json));
      ("case_id", string_option_json (json_string "case_id" json));
      ("title", string_option_json (json_string "title" json));
      ("origin", string_option_json (json_string "origin" json));
      ("subject_type", string_option_json (json_string "subject_type" json));
      ("risk_class", string_option_json (json_string "risk_class" json));
      ("source_refs", Json_util.json_string_list (json_string_list "source_refs" json));
      ("created_by", string_option_json (json_string "created_by" json));
      ("created_at", json_timestamp_string "created_at" json);
    ]

let requested_action_preview json =
  match json_member_opt "requested_action" json with
  | Some (`Assoc _ as action) -> (
      match json_string "action_type" action, json_string "target_type" action, json_string "target_id" action with
      | Some action_type, Some target_type, Some target_id ->
          Some (Printf.sprintf "%s · %s:%s" action_type target_type target_id)
      | Some action_type, Some target_type, None ->
          Some (Printf.sprintf "%s · %s" action_type target_type)
      | Some action_type, None, _ -> Some action_type
      | None, _, _ -> None)
  | _ -> None

let requested_action_context json =
  match json_member_opt "requested_action" json with
  | Some (`Assoc _ as action) ->
      let target_type = json_string "target_type" action in
      let target_id = json_string "target_id" action in
      let context_fields =
        []
        @
        (match target_type, target_id with
         | Some "board_post", Some id -> [ ("board_post_id", `String id) ]
         | _ -> [])
        @
        (match target_type, target_id with
         | Some "task", Some id -> [ ("task_id", `String id) ]
         | _ -> [])
        @
        (match target_type, target_id with
         | Some "operation", Some id -> [ ("operation_id", `String id) ]
         | _ -> [])
        @
        (match target_type, target_id with
         | Some "team_session", Some id -> [ ("team_session_id", `String id) ]
         | _ -> [])
      in
      if context_fields = [] then `Null else `Assoc context_fields
  | _ -> `Null

let linked_target_id ~target_type ~target_id expected_type =
  match target_type, target_id with
  | Some found_type, Some id when String.equal found_type expected_type -> string_option_json (Some id)
  | _ -> `Null

let derive_case_status ~case_status ~execution_order_status =
  match execution_order_status with
  | Some "needs_human_gate" -> "needs_human_gate"
  | Some "queued_auto" | Some "ready_auto_execute" -> "ready_auto_execute"
  | Some "auto_executed" | Some "done" -> "executed"
  | Some "denied" | Some "blocked" -> "blocked"
  | Some other when String.trim other <> "" -> other
  | _ ->
      let normalized = String.lowercase_ascii (String.trim case_status) in
      if normalized = "" then "pending_ruling" else normalized

let is_open_status status =
  let normalized = String.lowercase_ascii (String.trim status) in
  normalized <> "executed" && normalized <> "blocked" && normalized <> "closed"

let governance_event ~kind ~item_id ~topic ?summary ?actor ?decision created_at_ts =
  `Assoc
    [
      ("kind", `String kind);
      ("item_kind", `String "case");
      ("item_id", `String item_id);
      ("topic", `String topic);
      ("created_at", option_to_json (fun ts -> `String (iso_of_unix ts)) created_at_ts);
      ("summary", string_option_json summary);
      ("actor", string_option_json actor);
      ("decision", string_option_json decision);
    ]

let maybe_test_case case_json =
  let title = json_string_default ~default:"" "title" case_json in
  let origin = json_string_default ~default:"" "origin" case_json in
  String.contains title '_' && String.contains title '_'
  && String.contains origin 't' && String.starts_with ~prefix:"__gov_test_" (String.lowercase_ascii title |> String.trim |> String.sub 17 (max 0 (String.length title - 17)))

let keep_case ~include_test case_json =
  if include_test then true else not (maybe_test_case case_json)

let case_projection_of_json ~base_path ~petitions ~rulings ~execution_orders
    ~live_case_judgments case_json =
  let case_id = json_string_default ~default:"" "id" case_json in
  if case_id = "" then None
  else
    let petition_ids = json_string_list "petition_ids" case_json in
    let petitions_for_case =
      petitions
      |> List.filter (fun petition ->
             match json_string "case_id" petition with
             | Some linked_case_id when String.equal linked_case_id case_id -> true
             | _ -> (
                 match json_string "id" petition with
                 | Some petition_id -> List.mem petition_id petition_ids
                 | None -> false))
      |> List.sort (fun a b ->
             match json_timestamp_opt "created_at" b, json_timestamp_opt "created_at" a with
             | Some ts_b, Some ts_a -> Float.compare ts_b ts_a
             | _ -> 0)
    in
    let normalized_petitions = List.map normalize_petition petitions_for_case in
    let briefs =
      Safe_ops.json_list "briefs" case_json
      |> List.mapi (fun index brief ->
             normalize_case_brief ~case_id ~index brief)
    in
    let case_rulings =
      rulings
      |> List.filter (fun ruling ->
             match json_string "case_id" ruling with
             | Some linked_case_id -> String.equal linked_case_id case_id
             | None -> false)
    in
    let ruling_json =
      match latest_by_ts case_rulings "generated_at" with
      | Some ruling -> Some (normalize_judgment ruling)
      | None ->
          live_case_judgments
          |> List.find_opt (fun judgment ->
                 match json_string "target_id" judgment with
                 | Some target_id -> String.equal target_id case_id
                 | None -> false)
          |> Option.map normalize_judgment
    in
    let execution_order_json =
      execution_orders
      |> List.filter (fun order ->
             match json_string "case_id" order with
             | Some linked_case_id -> String.equal linked_case_id case_id
             | None -> false)
      |> latest_by_ts "updated_at"
      |> Option.map normalize_execution_order
    in
    let case_status = json_string_default ~default:"pending_ruling" "status" case_json in
    let execution_order_status =
      match execution_order_json with
      | Some order -> json_string "status" order
      | None -> None
    in
    let status = derive_case_status ~case_status ~execution_order_status in
    let requested_action =
      match json_member_opt "requested_action" case_json with
      | Some value -> normalize_resolved_action value
      | None -> `Null
    in
    let truth_summary = requested_action_preview case_json in
    let evidence_refs =
      dedup_strings
        (json_string_list "source_refs" case_json
         @ List.concat_map (json_string_list "source_refs") petitions_for_case
         @
         (match ruling_json with
          | Some ruling -> json_string_list "evidence_refs" ruling
          | None -> []))
    in
    let ruling_summary =
      match ruling_json with
      | Some ruling -> json_string "summary" ruling
      | None -> None
    in
    let confidence =
      match ruling_json with
      | Some ruling -> Safe_ops.json_float_opt "confidence" ruling
      | None -> None
    in
    let related_agents =
      match ruling_json with
      | Some ruling -> json_string_list "related_agents" ruling
      | None -> []
    in
    let last_activity_ts =
      let base =
        max_opt (json_timestamp_opt "updated_at" case_json)
          (json_timestamp_opt "created_at" case_json)
      in
      let with_petitions =
        List.fold_left
          (fun acc petition -> max_opt acc (json_timestamp_opt "created_at" petition))
          base petitions_for_case
      in
      let with_briefs =
        Safe_ops.json_list "briefs" case_json
        |> List.fold_left
             (fun acc brief -> max_opt acc (json_timestamp_opt "created_at" brief))
             with_petitions
      in
      let with_ruling =
        match ruling_json with
        | Some ruling -> max_opt with_briefs (json_timestamp_opt "generated_at" ruling)
        | None -> with_briefs
      in
      match execution_order_json with
      | Some order ->
          max_opt with_ruling
            (max_opt (json_timestamp_opt "updated_at" order) (json_timestamp_opt "created_at" order))
      | None -> with_ruling
    in
    let target_type, target_id =
      match json_member_opt "requested_action" case_json with
      | Some (`Assoc _ as action) -> (json_string "target_type" action, json_string "target_id" action)
      | _ -> (None, None)
    in
    let case_core_json =
      `Assoc
        [
          ("id", `String case_id);
          ("petition_ids", Json_util.json_string_list petition_ids);
          ("title", `String (json_string_default ~default:case_id "title" case_json));
          ("origin", string_option_json (json_string "origin" case_json));
          ("subject_type", string_option_json (json_string "subject_type" case_json));
          ("risk_class", string_option_json (json_string "risk_class" case_json));
          ("status", `String status);
          ("created_at", json_timestamp_string "created_at" case_json);
          ("updated_at", json_timestamp_string "updated_at" case_json);
          ("source_refs", Json_util.json_string_list (json_string_list "source_refs" case_json));
          ("briefs", `List briefs);
        ]
    in
    let item_json =
      `Assoc
        [
          ("kind", `String "case");
          ("id", `String case_id);
          ("topic", `String (json_string_default ~default:case_id "title" case_json));
          ("status", `String status);
          ("origin", string_option_json (json_string "origin" case_json));
          ("subject_type", string_option_json (json_string "subject_type" case_json));
          ("risk_class", string_option_json (json_string "risk_class" case_json));
          ("provenance", string_option_json (json_string "normalized_key" case_json));
          ("auto_execution_state", string_option_json execution_order_status);
          ("petition_count", `Int (List.length petitions_for_case));
          ("brief_count", `Int (List.length briefs));
          ("last_activity_at", option_to_json (fun ts -> `String (iso_of_unix ts)) last_activity_ts);
          ("truth_summary", string_option_json truth_summary);
          ("judgment_summary", string_option_json ruling_summary);
          ( "confidence",
            match confidence with
            | Some value -> `Float value
            | None -> `Null );
          ("related_agents", Json_util.json_string_list related_agents);
          ("context", requested_action_context case_json);
          ("linked_board_post_id", linked_target_id ~target_type ~target_id "board_post");
          ("linked_task_id", linked_target_id ~target_type ~target_id "task");
          ("linked_operation_id", linked_target_id ~target_type ~target_id "operation");
          ("linked_session_id", linked_target_id ~target_type ~target_id "team_session");
          ("recommended_action", requested_action);
          ( "executed_route",
            match ruling_json with
            | Some ruling -> (
                match json_member_opt "executed_route" ruling with
                | Some value -> normalize_executed_route value
                | None -> `Null)
            | None -> `Null );
          ( "guardrail_state",
            match ruling_json with
            | Some ruling -> (
                match json_member_opt "guardrail_state" ruling with
                | Some value -> normalize_guardrail_state value
                | None -> `Null)
            | None -> `Null );
          ("evidence_refs", Json_util.json_string_list evidence_refs);
        ]
    in
    let events =
      let petition_events =
        petitions_for_case
        |> List.map (fun petition ->
               governance_event
                 ~kind:"petition_submitted"
                 ~item_id:case_id
                 ~topic:(json_string_default ~default:case_id "title" case_json)
                 ?summary:(json_string "title" petition)
                 ?actor:(match json_string "created_by" petition with
                        | Some value -> Some value
                        | None -> json_string "origin" petition)
                 (json_timestamp_opt "created_at" petition))
      in
      let brief_events =
        Safe_ops.json_list "briefs" case_json
        |> List.filter_map (fun brief ->
               let summary =
                 match json_string "summary" brief with
                 | Some value -> Some value
                 | None -> json_string "content" brief
               in
               match summary with
               | None -> None
               | Some brief_summary ->
                   Some
                     (governance_event
                        ~kind:"brief_submitted"
                        ~item_id:case_id
                        ~topic:(json_string_default ~default:case_id "title" case_json)
                        ~summary:brief_summary
                        ?actor:(json_string "author" brief)
                        (json_timestamp_opt "created_at" brief)))
      in
      let ruling_events =
        match ruling_json with
        | Some ruling ->
            [
              governance_event
                ~kind:"ruling_issued"
                ~item_id:case_id
                ~topic:(json_string_default ~default:case_id "title" case_json)
                ?summary:(json_string "summary" ruling)
                ?actor:(json_string "keeper_name" ruling)
                ?decision:(json_string "status" ruling)
                (json_timestamp_opt "generated_at" ruling);
            ]
        | None -> []
      in
      let execution_events =
        match execution_order_json with
        | Some order ->
            [
              governance_event
                ~kind:"execution_order"
                ~item_id:case_id
                ~topic:(json_string_default ~default:case_id "title" case_json)
                ?summary:(match json_string "result_summary" order with
                         | Some value -> Some value
                         | None -> json_string "status" order)
                ?actor:(json_string "actor" order)
                ?decision:(json_string "status" order)
                (max_opt (json_timestamp_opt "updated_at" order) (json_timestamp_opt "created_at" order));
            ]
        | None -> []
      in
      petition_events @ brief_events @ ruling_events @ execution_events
    in
    let bundle_json =
      `Assoc
        [
          ("case", case_core_json);
          ("petitions", `List normalized_petitions);
          ("ruling", option_to_yojson (fun value -> value) ruling_json);
          ("execution_order", option_to_yojson (fun value -> value) execution_order_json);
          ("activity", `List events);
        ]
    in
    Some { id = case_id; status; last_activity_ts; item_json; case_json = case_core_json; bundle_json }

let load_case_projections ~base_path ~include_test =
  let case_jsons =
    read_json_objects (cases_dir base_path)
    |> List.filter (keep_case ~include_test)
  in
  let petition_jsons = read_json_objects (petitions_dir base_path) in
  let ruling_jsons = read_json_objects (rulings_dir base_path) in
  let execution_order_jsons = read_json_objects (execution_orders_dir base_path) in
  let live_case_judgments =
    Dashboard_governance_judge.latest_judgments base_path
    |> List.filter (fun judgment ->
           match json_string "target_id" judgment, json_string "target_kind" judgment with
           | Some _, Some "case" -> true
           | Some _, Some "governance_case" -> true
           | Some _, None -> true
           | _ -> false)
  in
  case_jsons
  |> List.filter_map
       (case_projection_of_json ~base_path ~petitions:petition_jsons
          ~rulings:ruling_jsons ~execution_orders:execution_order_jsons
          ~live_case_judgments)
  |> List.sort (fun a b ->
         match b.last_activity_ts, a.last_activity_ts with
         | Some ts_b, Some ts_a ->
             let by_ts = Float.compare ts_b ts_a in
             if by_ts <> 0 then by_ts else String.compare a.id b.id
         | Some _, None -> 1
         | None, Some _ -> -1
         | None, None -> String.compare a.id b.id)

let build_activity projections =
  projections
  |> List.concat_map (fun projection ->
         match projection.bundle_json with
         | `Assoc fields -> (
             match List.assoc_opt "activity" fields with
             | Some (`List events) -> events
             | _ -> [])
         | _ -> [])
  |> List.sort (fun a b ->
         match json_timestamp_opt "created_at" b, json_timestamp_opt "created_at" a with
         | Some ts_b, Some ts_a ->
             let by_ts = Float.compare ts_b ts_a in
             if by_ts <> 0 then by_ts else 0
         | Some _, None -> 1
         | None, Some _ -> -1
         | None, None -> 0)
  |> List.mapi (fun index event ->
         match event with
         | `Assoc fields ->
             `Assoc (("index", `Int index) :: List.remove_assoc "index" fields)
         | other -> other)

let status_matches_filter status = function
  | None -> true
  | Some expected ->
      String.equal
        (String.lowercase_ascii (String.trim status))
        (String.lowercase_ascii (String.trim expected))

let paged items ~limit ~offset =
  items |> List.filteri (fun index _ -> index >= offset && index < offset + limit)

let summary_json_of_runtime ~projections (runtime : Dashboard_governance_judge.runtime_snapshot) =
  let pending_approval_count = Keeper_approval_queue.pending_count () in
  let cases_open =
    projections
    |> List.fold_left
         (fun acc projection -> if is_open_status projection.status then acc + 1 else acc)
         0
  in
  let pending_ruling =
    projections
    |> List.fold_left
         (fun acc projection ->
           if String.equal projection.status "pending_ruling" then acc + 1 else acc)
         0
  in
  let ready_auto_execute =
    projections
    |> List.fold_left
         (fun acc projection ->
           if String.equal projection.status "ready_auto_execute" then acc + 1 else acc)
         0
  in
  let case_needs_human_gate =
    projections
    |> List.fold_left
         (fun acc projection ->
           if String.equal projection.status "needs_human_gate" then acc + 1 else acc)
         0
  in
  let executed =
    projections
    |> List.fold_left
         (fun acc projection ->
           if String.equal projection.status "executed" then acc + 1 else acc)
         0
  in
  let blocked =
    projections
    |> List.fold_left
         (fun acc projection ->
           if List.mem projection.status [ "blocked"; "closed" ] then acc + 1 else acc)
         0
  in
  let now_ts = Unix.gettimeofday () in
  let oldest_open_case_age_s =
    projections
    |> List.filter (fun projection -> is_open_status projection.status)
    |> List.filter_map (fun projection -> projection.last_activity_ts)
    |> List.sort Float.compare
    |> List.hd_opt
    |> Option.map (fun ts -> max 0 (int_of_float (now_ts -. ts)))
  in
  let last_activity_age_s =
    projections
    |> List.filter_map (fun projection -> projection.last_activity_ts)
    |> List.sort (fun a b -> Float.compare b a)
    |> List.hd_opt
    |> Option.map (fun ts -> max 0 (int_of_float (now_ts -. ts)))
  in
  `Assoc
    [
      ("cases_open", `Int cases_open);
      ("pending_ruling", `Int pending_ruling);
      ("ready_auto_execute", `Int ready_auto_execute);
      ("needs_human_gate", `Int (case_needs_human_gate + pending_approval_count));
      ("executed", `Int executed);
      ("blocked", `Int blocked);
      ("ready_to_execute", `Int ready_auto_execute);
      ( "oldest_open_case_age_s",
        match oldest_open_case_age_s with
        | Some value -> `Int value
        | None -> `Null );
      ( "last_activity_age_s",
        match last_activity_age_s with
        | Some value -> `Int value
        | None -> `Null );
      ("judge_online", `Bool runtime.judge_online);
      ("judge_last_seen_at", timestamp_option_json runtime.generated_at runtime.generated_at_unix);
    ]

and timestamp_option_json value unix_value =
  match value, unix_value with
  | Some iso, _ -> `String iso
  | None, Some ts -> `String (Types.iso8601_of_unix_seconds ts)
  | None, None -> `Null

let judge_json_of_runtime (runtime : Dashboard_governance_judge.runtime_snapshot) =
  `Assoc
    [
      ("judge_online", `Bool runtime.judge_online);
      ("refreshing", `Bool runtime.refreshing);
      ("generated_at", timestamp_option_json runtime.generated_at runtime.generated_at_unix);
      ("expires_at", timestamp_option_json runtime.expires_at runtime.expires_at_unix);
      ("model_used", string_option_json runtime.model_used);
      ("keeper_name", `String runtime.keeper_name);
      ("last_error", string_option_json runtime.last_error);
    ]

let factual_snapshot_json ~base_path =
  let projections = load_case_projections ~base_path ~include_test:false in
  let activity = build_activity projections |> take 100 in
  `Assoc
    ([
       ("generated_at", `String (Types.now_iso ()));
       ("items", `List (List.map (fun projection -> projection.item_json) projections));
       ("activity", `List activity);
     ]
    @ governance_surface_fields)

let dashboard_json ~base_path ~limit ~offset ~status_filter =
  let runtime = Dashboard_governance_judge.runtime_status base_path in
  let all_projections = load_case_projections ~base_path ~include_test:false in
  let filtered_projections =
    all_projections
    |> List.filter (fun projection -> status_matches_filter projection.status status_filter)
  in
  let visible_projections = paged filtered_projections ~limit ~offset in
  let judgments = Dashboard_governance_judge.fresh_judgments_json ~base_path ~limit in
  let approval_queue = Keeper_approval_queue.list_pending_dashboard_json () in
  let activity = build_activity filtered_projections |> take 50 in
  `Assoc
    ([
       ("generated_at", `String (Types.now_iso ()));
       ("summary", summary_json_of_runtime ~projections:filtered_projections runtime);
       ("items", `List (List.map (fun projection -> projection.item_json) visible_projections));
       ("activity", `List activity);
       ("judge", judge_json_of_runtime runtime);
       ("judgments", `List judgments);
       ("pending_actions", `List []);
       ("approval_queue", approval_queue);
       ("cases", `List (List.map (fun projection -> projection.case_json) visible_projections));
     ]
    @ governance_surface_fields)

let cases_json ~base_path ~limit ~offset ~status_filter ~include_test =
  let projections =
    load_case_projections ~base_path ~include_test
    |> List.filter (fun projection -> status_matches_filter projection.status status_filter)
  in
  let visible = paged projections ~limit ~offset in
  `Assoc
    ([
       ("cases", `List (List.map (fun projection -> projection.case_json) visible));
       ("count", `Int (List.length projections));
       ("limit", `Int limit);
       ("offset", `Int offset);
     ]
    @ governance_surface_fields)

let case_detail_json ~base_path ~case_id =
  let projections = load_case_projections ~base_path ~include_test:true in
  match List.find_opt (fun projection -> String.equal projection.id case_id) projections with
  | Some projection -> (`OK, projection.bundle_json)
  | None ->
      ( `Not_found,
        `Assoc
          ([
             ("error", `String "Governance case not found");
           ]
          @ governance_surface_fields) )
