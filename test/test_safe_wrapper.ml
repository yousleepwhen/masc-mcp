module Lib = Masc_mcp

open Alcotest

let test_dir () =
  let tmp = Filename.temp_file "masc_safe_wrapper" "" in
  Sys.remove tmp;
  Unix.mkdir tmp 0o755;
  tmp

let cleanup_dir dir =
  let rec rm path =
    if Sys.file_exists path then
      if Sys.is_directory path then begin
        Sys.readdir path |> Array.iter (fun f -> rm (Filename.concat path f));
        Unix.rmdir path
      end else
        Sys.remove path
  in
  rm dir

let git_ok dir argv =
  let command = String.concat " " (List.map Filename.quote ("git" :: "-C" :: dir :: argv)) in
  match Sys.command command with
  | 0 -> ()
  | code -> failf "git command failed (%d): %s" code command

let write_file path data =
  let channel = open_out path in
  Fun.protect
    ~finally:(fun () -> close_out channel)
    (fun () -> output_string channel data)

let with_repo f =
  let dir = test_dir () in
  Fun.protect
    ~finally:(fun () -> cleanup_dir dir)
    (fun () ->
      git_ok dir [ "init"; "-b"; "main" ];
      git_ok dir [ "config"; "user.email"; "safe-wrapper@test.local" ];
      git_ok dir [ "config"; "user.name"; "Safe Wrapper Test" ];
      write_file (Filename.concat dir "README.md") "hello\n";
      git_ok dir [ "add"; "README.md" ];
      git_ok dir [ "commit"; "-m"; "init" ];
      let config = Lib.Room.default_config dir in
      ignore (Lib.Room.init config ~agent_name:(Some "tester"));
      let ctx : Lib.Tool_safe_wrapper.context = { config; agent_name = "tester" } in
      f dir config ctx)

let test_download_inspect_uses_masc_downloads () =
  with_repo @@ fun dir _config ctx ->
  let ok, body =
    match
      Lib.Tool_safe_wrapper.dispatch ctx ~name:"masc_safe_download"
        ~args:
          (`Assoc
            [
              ("url", `String "https://example.com/archive.tar.gz");
            ])
    with
    | Some result -> result
    | None -> fail "dispatch returned None"
  in
  check bool "inspect ok" true ok;
  let open Yojson.Safe.Util in
  let json = Yojson.Safe.from_string body in
  let destination = json |> member "destination_path" |> to_string in
  check bool "destination under .masc/downloads" true
    (String.starts_with ~prefix:(Filename.concat dir ".masc/downloads") destination);
  check string "mode default inspect" "inspect" (json |> member "mode" |> to_string)

let test_git_clone_inspect_normalizes_owner_repo () =
  with_repo @@ fun dir _config ctx ->
  let ok, body =
    match
      Lib.Tool_safe_wrapper.dispatch ctx ~name:"masc_safe_git_clone"
        ~args:
          (`Assoc
            [
              ("repo", `String "openai/openai-python");
            ])
    with
    | Some result -> result
    | None -> fail "dispatch returned None"
  in
  check bool "inspect ok" true ok;
  let open Yojson.Safe.Util in
  let json = Yojson.Safe.from_string body in
  check string "normalized repo url"
    "https://github.com/openai/openai-python.git"
    (json |> member "repo_url" |> to_string);
  check bool "destination under external repos" true
    (String.starts_with
       ~prefix:(Filename.concat dir ".masc/external/repos")
       (json |> member "destination_path" |> to_string))

let test_git_pull_inspect_refuses_root_checkout () =
  with_repo @@ fun _dir _config ctx ->
  let ok, body =
    match
      Lib.Tool_safe_wrapper.dispatch ctx ~name:"masc_safe_git_pull"
        ~args:(`Assoc [ ("path", `String ".") ])
    with
    | Some result -> result
    | None -> fail "dispatch returned None"
  in
  check bool "inspect ok" true ok;
  let open Yojson.Safe.Util in
  let json = Yojson.Safe.from_string body in
  check string "location kind" "root_checkout"
    (json |> member "location_kind" |> to_string);
  check bool "execute refused" false
    (json |> member "execute_allowed" |> to_bool)

let test_git_pull_inspect_allows_external_repo () =
  with_repo @@ fun dir config ctx ->
  let external_root = Filename.concat dir ".masc/external/repos/demo" in
  Fs_compat.mkdir_p external_root;
  git_ok external_root [ "init"; "-b"; "main" ];
  git_ok external_root [ "config"; "user.email"; "safe-wrapper@test.local" ];
  git_ok external_root [ "config"; "user.name"; "Safe Wrapper Test" ];
  write_file (Filename.concat external_root "README.md") "demo\n";
  git_ok external_root [ "add"; "README.md" ];
  git_ok external_root [ "commit"; "-m"; "init" ];
  let ok, body =
    match
      Lib.Tool_safe_wrapper.dispatch ctx ~name:"masc_safe_git_pull"
        ~args:(`Assoc [ ("path", `String ".masc/external/repos/demo") ])
    with
    | Some result -> result
    | None -> fail "dispatch returned None"
  in
  ignore config;
  check bool "inspect ok" true ok;
  let open Yojson.Safe.Util in
  let json = Yojson.Safe.from_string body in
  check string "location kind" "external_repo"
    (json |> member "location_kind" |> to_string);
  check bool "execute allowed" true
    (json |> member "execute_allowed" |> to_bool)

let () =
  run "safe_wrapper"
    [
      ( "inspect",
        [
          test_case "download inspect uses .masc/downloads" `Quick
            test_download_inspect_uses_masc_downloads;
          test_case "git clone inspect normalizes owner/repo" `Quick
            test_git_clone_inspect_normalizes_owner_repo;
          test_case "git pull inspect refuses root checkout" `Quick
            test_git_pull_inspect_refuses_root_checkout;
          test_case "git pull inspect allows external repo" `Quick
            test_git_pull_inspect_allows_external_repo;
        ] );
    ]
