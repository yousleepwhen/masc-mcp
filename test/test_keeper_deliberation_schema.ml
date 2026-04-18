open Alcotest

module DS = Masc_mcp.Keeper_deliberation_schema
module D = Masc_mcp.Keeper_deliberation

let test_task_context_build () =
  let ctx = DS.build_task_context ~task_id:"task-101" ~keeper_name:"minjae" ~task_type:"claim" in
  check string "task_id matches" "task-101" ctx.task_id;
  check string "keeper_name matches" "minjae" ctx.keeper_name;
  check string "task_type matches" "claim" ctx.task_type;
  check string "schema_version is 3.0" "3.0" ctx.schema_version

let test_validate_task_claim_valid () =
  let ctx = DS.build_task_context ~task_id:"task-101" ~keeper_name:"minjae" ~task_type:"claim" in
  let action = D.TaskClaim { task_id = "task-101"; reason = "test" } in
  let result = DS.validate_action ~task_ctx:ctx action in
  check bool "task claim is valid" true (result = DS.Valid)

let test_validate_task_claim_mismatch () =
  let ctx = DS.build_task_context ~task_id:"task-101" ~keeper_name:"minjae" ~task_type:"claim" in
  let action = D.TaskClaim { task_id = "task-999"; reason = "test" } in
  let result = DS.validate_action ~task_ctx:ctx action in
  check bool "mismatched task_id is invalid" true (match result with DS.Invalid _ -> true | _ -> false)

let test_validate_noop () =
  let ctx = DS.build_task_context ~task_id:"task-101" ~keeper_name:"minjae" ~task_type:"claim" in
  let action = D.Noop "skip" in
  let result = DS.validate_action ~task_ctx:ctx action in
  check bool "noop is always valid" true (result = DS.Valid)

let test_validate_board_post_valid () =
  let ctx = DS.build_task_context ~task_id:"task-101" ~keeper_name:"minjae" ~task_type:"claim" in
  let action = D.BoardPost { content = "test content"; hearth = None } in
  let result = DS.validate_action ~task_ctx:ctx action in
  check bool "board post with content is valid" true (result = DS.Valid)

let test_validate_board_post_empty_content () =
  let ctx = DS.build_task_context ~task_id:"task-101" ~keeper_name:"minjae" ~task_type:"claim" in
  let action = D.BoardPost { content = ""; hearth = None } in
  let result = DS.validate_action ~task_ctx:ctx action in
  check bool "board post with empty content is invalid" true (match result with DS.Invalid _ -> true | _ -> false)

let test_validate_board_vote () =
  let ctx = DS.build_task_context ~task_id:"task-101" ~keeper_name:"minjae" ~task_type:"claim" in
  let action = D.BoardVote { post_id = "post-1"; direction = "up" } in
  let result = DS.validate_action ~task_ctx:ctx action in
  check bool "board vote with valid direction is valid" true (result = DS.Valid)

let test_validate_board_vote_invalid_direction () =
  let ctx = DS.build_task_context ~task_id:"task-101" ~keeper_name:"minjae" ~task_type:"claim" in
  let action = D.BoardVote { post_id = "post-1"; direction = "sideways" } in
  let result = DS.validate_action ~task_ctx:ctx action in
  check bool "board vote with invalid direction is invalid" true (match result with DS.Invalid _ -> true | _ -> false)

let test_init_state () =
  let ctx = DS.build_task_context ~task_id:"task-101" ~keeper_name:"minjae" ~task_type:"claim" in
  let state = DS.init_state ~task_context:ctx in
  check string "state task_id matches" "task-101" state.task_context.task_id;
  check bool "initial last_action is None" true (state.last_action = None);
  check bool "initial validation is Valid" true (state.validation_status = DS.Valid);
  check bool "initial schema_compliant is true" true state.schema_compliant

let test_update_state_valid_action () =
  let ctx = DS.build_task_context ~task_id:"task-101" ~keeper_name:"minjae" ~task_type:"claim" in
  let state = DS.init_state ~task_context:ctx in
  let action = D.TaskClaim { task_id = "task-101"; reason = "test" } in
  let new_state = DS.update_state_after_action state action in
  check bool "last_action is updated" true (new_state.last_action = Some action);
  check bool "validation is Valid" true (new_state.validation_status = DS.Valid);
  check bool "schema_compliant is true" true new_state.schema_compliant

let test_update_state_invalid_action () =
  let ctx = DS.build_task_context ~task_id:"task-101" ~keeper_name:"minjae" ~task_type:"claim" in
  let state = DS.init_state ~task_context:ctx in
  let action = D.TaskClaim { task_id = "task-999"; reason = "test" } in
  let new_state = DS.update_state_after_action state action in
  check bool "schema_compliant is false on invalid action" true (not new_state.schema_compliant)

let test_state_to_json () =
  let ctx = DS.build_task_context ~task_id:"task-101" ~keeper_name:"minjae" ~task_type:"claim" in
  let state = DS.init_state ~task_context:ctx in
  let json = DS.state_to_json state in
  match json with
  | `Assoc fields ->
      check bool "json has task_context field" true (List.mem_assoc "task_context" fields);
      check bool "json has validation_status field" true (List.mem_assoc "validation_status" fields);
      check bool "json has schema_compliant field" true (List.mem_assoc "schema_compliant" fields)
  | _ -> fail "expected JSON object"

let test_round_trip_board_post () =
  let action = D.BoardPost { content = "test"; hearth = Some "❤️" } in
  let result = DS.validate_round_trip action in
  check bool "board post round trip is valid" true (result = DS.Valid)

let test_multi_step_validation () =
  let ctx = DS.build_task_context ~task_id:"task-101" ~keeper_name:"minjae" ~task_type:"claim" in
  let actions = [
    D.Noop "skip";
    D.BoardPost { content = "update"; hearth = None };
  ] in
  let action = D.MultiStep actions in
  let result = DS.validate_action ~task_ctx:ctx action in
  check bool "valid multi-step is valid" true (result = DS.Valid)

let test_multi_step_empty_fails () =
  let ctx = DS.build_task_context ~task_id:"task-101" ~keeper_name:"minjae" ~task_type:"claim" in
  let action = D.MultiStep [] in
  let result = DS.validate_action ~task_ctx:ctx action in
  check bool "empty multi-step is invalid" true (match result with DS.Invalid _ -> true | _ -> false)

let () =
  run "Keeper_deliberation_schema" [
    ("context", [
      test_case "build_task_context" `Quick test_task_context_build;
    ]);
    ("validation", [
      test_case "validate_task_claim_valid" `Quick test_validate_task_claim_valid;
      test_case "validate_task_claim_mismatch" `Quick test_validate_task_claim_mismatch;
      test_case "validate_noop" `Quick test_validate_noop;
      test_case "validate_board_post_valid" `Quick test_validate_board_post_valid;
      test_case "validate_board_post_empty_content" `Quick test_validate_board_post_empty_content;
      test_case "validate_board_vote" `Quick test_validate_board_vote;
      test_case "validate_board_vote_invalid_direction" `Quick test_validate_board_vote_invalid_direction;
    ]);
    ("state", [
      test_case "init_state" `Quick test_init_state;
      test_case "update_state_valid_action" `Quick test_update_state_valid_action;
      test_case "update_state_invalid_action" `Quick test_update_state_invalid_action;
    ]);
    ("serialization", [
      test_case "state_to_json" `Quick test_state_to_json;
      test_case "round_trip_board_post" `Quick test_round_trip_board_post;
    ]);
    ("multi_step", [
      test_case "multi_step_validation" `Quick test_multi_step_validation;
      test_case "multi_step_empty_fails" `Quick test_multi_step_empty_fails;
    ]);
  ]
