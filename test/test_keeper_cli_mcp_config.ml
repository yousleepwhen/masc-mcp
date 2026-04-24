(* #10049: tests for Claude Code / Kimi CLI MCP config auto-construction. *)

open Alcotest
module K = Masc_mcp.Keeper_cli_mcp_config
module Env = Masc_mcp.Env_config_core

let with_env key value f =
  let prior = Sys.getenv_opt key in
  Unix.putenv key value;
  Fun.protect ~finally:(fun () -> Unix.putenv key (Option.value prior ~default:"")) f
;;

let with_auto_construct_env f =
  with_env K.feature_flag_env "true"
  @@ fun () ->
  with_env Env.host_env_key "127.0.0.9"
  @@ fun () -> with_env Env.http_port_env_key "18935" f
;;

let temp_base () =
  let dir = Filename.temp_file "keeper_cli_mcp_config_" "" in
  Unix.unlink dir;
  Unix.mkdir dir 0o755;
  Unix.mkdir (Filename.concat dir ".masc") 0o755;
  Unix.mkdir (Filename.concat (Filename.concat dir ".masc") "auth") 0o755;
  dir
;;

let write_token base_path agent_name content =
  let auth_dir = Filename.concat (Filename.concat base_path ".masc") "auth" in
  let path = Filename.concat auth_dir (agent_name ^ ".token") in
  let oc = open_out_bin path in
  output_string oc content;
  close_out oc
;;

let rm_rf path =
  let rec rm p =
    match Unix.lstat p with
    | { Unix.st_kind = Unix.S_DIR; _ } ->
      Array.iter (fun n -> rm (Filename.concat p n)) (Sys.readdir p);
      Unix.rmdir p
    | _ -> Unix.unlink p
    | exception Unix.Unix_error _ -> ()
  in
  rm path
;;

let test_build_json_shape () =
  let out = K.build_json ~url:"http://127.0.0.1:8935/mcp" ~bearer_token:"tok" in
  let json = Yojson.Safe.from_string out in
  let open Yojson.Safe.Util in
  let masc = json |> member "mcpServers" |> member "masc" in
  check string "url field" "http://127.0.0.1:8935/mcp" (masc |> member "url" |> to_string);
  check string "type field" "http" (masc |> member "type" |> to_string);
  check
    string
    "authorization header"
    "Bearer tok"
    (masc |> member "headers" |> member "Authorization" |> to_string)
;;

let test_feature_flag_env_name () =
  check string "env key is stable" "MASC_AUTO_CONSTRUCT_CLAUDE_MCP" K.feature_flag_env
;;

let test_try_construct_disabled_by_default () =
  (* No env set, no token file: should return None regardless. *)
  Unix.putenv K.feature_flag_env "";
  let base = Filename.get_temp_dir_name () in
  let out = K.try_construct_for_keeper ~base_path:base ~agent_name:"nobody" in
  check (option string) "disabled flag returns None" None out
;;

let test_try_construct_happy_path () =
  let base = temp_base () in
  Fun.protect ~finally:(fun () -> rm_rf base)
  @@ fun () ->
  write_token base "keeper-demo-agent" "  hex_token_abc123\n";
  with_auto_construct_env
  @@ fun () ->
  match K.try_construct_for_keeper ~base_path:base ~agent_name:"keeper-demo-agent" with
  | None -> fail "expected Some JSON, got None"
  | Some json ->
    let doc = Yojson.Safe.from_string json in
    let open Yojson.Safe.Util in
    let masc = doc |> member "mcpServers" |> member "masc" in
    check string "url" "http://127.0.0.9:18935/mcp" (masc |> member "url" |> to_string);
    check
      string
      "authorization header"
      "Bearer hex_token_abc123"
      (masc |> member "headers" |> member "Authorization" |> to_string)
;;

let test_try_construct_missing_token_file () =
  let base = temp_base () in
  Fun.protect ~finally:(fun () -> rm_rf base)
  @@ fun () ->
  with_auto_construct_env
  @@ fun () ->
  let out = K.try_construct_for_keeper ~base_path:base ~agent_name:"keeper-ghost-agent" in
  check (option string) "missing token returns None" None out
;;

let test_try_construct_empty_token_file () =
  let base = temp_base () in
  Fun.protect ~finally:(fun () -> rm_rf base)
  @@ fun () ->
  write_token base "keeper-empty-agent" "  \n";
  with_auto_construct_env
  @@ fun () ->
  let out = K.try_construct_for_keeper ~base_path:base ~agent_name:"keeper-empty-agent" in
  check (option string) "empty token returns None" None out
;;

let () =
  run
    "keeper_cli_mcp_config"
    [ ( "build_json"
      , [ test_case "shape includes url/type/Authorization" `Quick test_build_json_shape ]
      )
    ; ( "flag"
      , [ test_case "env key stable" `Quick test_feature_flag_env_name
        ; test_case "disabled → None" `Quick test_try_construct_disabled_by_default
        ] )
    ; ( "try_construct"
      , [ test_case "flagged happy path trims token" `Quick test_try_construct_happy_path
        ; test_case
            "missing token file → None"
            `Quick
            test_try_construct_missing_token_file
        ; test_case "empty token file → None" `Quick test_try_construct_empty_token_file
        ] )
    ]
;;
