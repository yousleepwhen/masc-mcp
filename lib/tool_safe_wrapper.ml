(** Safe inspect-first wrappers for download/clone/pull flows.

    These tools are intentionally hidden from the default public MCP surface.
    They default to [mode=inspect], return explicit preflight data, and only
    mutate state in [mode=execute]. *)

open Types
open Tool_args

type context = {
  config : Room.config;
  agent_name : string;
}

type result = bool * string

let json_ok fields =
  Yojson.Safe.pretty_to_string (`Assoc (("status", `String "ok") :: fields))

let json_error message =
  Yojson.Safe.pretty_to_string
    (`Assoc [ ("status", `String "error"); ("message", `String message) ])

let trim = String.trim

let starts_with ~prefix value = String.starts_with ~prefix value

let ensure_dir path =
  if not (Sys.file_exists path) then
    Fs_compat.mkdir_p path

let sanitize_segment raw =
  let base = Filename.basename (trim raw) in
  let replaced =
    Str.global_replace (Str.regexp "[^A-Za-z0-9._-]+") "-" base
  in
  let trimmed =
    replaced
    |> Str.global_replace (Str.regexp "^-+") ""
    |> Str.global_replace (Str.regexp "-+$") ""
  in
  if trimmed = "" then
    "item"
  else
    trimmed

let current_mode args =
  match get_string_opt args "mode" with
  | Some raw ->
      let mode = raw |> trim |> String.lowercase_ascii in
      if mode = "inspect" || mode = "execute" then
        Ok mode
      else
        Error "mode must be inspect or execute"
  | None -> Ok "inspect"

let json_bool value = `Bool value

let string_opt_json = function
  | Some value -> `String value
  | None -> `Null

let int_opt_json = function
  | Some value -> `Int value
  | None -> `Null

let list_json values = `List (List.map (fun value -> `String value) values)

let path_exists path = Sys.file_exists path

let file_size_opt path =
  try Some (Unix.stat path).Unix.st_size with _ -> None

let directory_nonempty path =
  try Sys.is_directory path && Array.length (Sys.readdir path) > 0 with _ -> false

let path_info_json path =
  let exists = path_exists path in
  let is_dir = if exists then (try Sys.is_directory path with _ -> false) else false in
  let size_bytes = if exists && not is_dir then file_size_opt path else None in
  `Assoc
    [
      ("path", `String path);
      ("exists", `Bool exists);
      ("is_directory", `Bool is_dir);
      ("nonempty", `Bool (if is_dir then directory_nonempty path else Option.value ~default:0 size_bytes > 0));
      ("size_bytes", int_opt_json size_bytes);
    ]

let run_status ?(timeout_sec = 30.0) argv =
  Process_eio.run_argv_with_status ~timeout_sec argv

let run_stdout ?(timeout_sec = 30.0) argv =
  match run_status ~timeout_sec argv with
  | Unix.WEXITED 0, output -> Ok (trim output)
  | _, output ->
      Error
        (Printf.sprintf "command failed: %s\n%s"
           (String.concat " " argv) (trim output))

let relative_to_base (config : Room.config) path =
  if Filename.is_relative path then
    Filename.concat config.Room.base_path path
  else
    path

let masc_downloads_dir config =
  Filename.concat (Room_utils.masc_dir config) "downloads"

let masc_external_repos_dir config =
  Filename.concat (Filename.concat (Room_utils.masc_dir config) "external") "repos"

let repo_root config =
  Room_git.git_root ~base_path:config.Room.base_path

let canonicalize_path path =
  try Unix.realpath path with
  | _ -> path

let within_dir ~root path =
  let root = canonicalize_path root in
  let path = canonicalize_path path in
  let normalized_root =
    if String.ends_with ~suffix:"/" root then root else root ^ "/"
  in
  String.equal path root || starts_with ~prefix:normalized_root path

let download_basename_of_url url =
  let path_part =
    match List.rev (String.split_on_char '/' url) with
    | leaf :: _ -> leaf
    | [] -> ""
  in
  let no_query =
    match String.split_on_char '?' path_part with
    | leaf :: _ -> leaf
    | [] -> path_part
  in
  if trim no_query = "" then
    let digest = Digestif.SHA256.(digest_string url |> to_hex) in
    "download-" ^ String.sub digest 0 12
  else
    sanitize_segment no_query

let normalize_download_request args =
  let url = get_string args "url" "" |> trim in
  if url = "" then
    Error "url is required"
  else if not (starts_with ~prefix:"https://" url || starts_with ~prefix:"http://" url) then
    Error "download url must use http or https"
  else
    let target_name =
      match get_string_opt args "target_name" with
      | Some raw when trim raw <> "" -> sanitize_segment raw
      | _ -> download_basename_of_url url
    in
    let expected_mime =
      match get_string_opt args "expected_mime" with
      | Some raw when trim raw <> "" -> Some (trim raw)
      | _ -> None
    in
    let sha256 =
      match get_string_opt args "sha256" with
      | Some raw when trim raw <> "" -> Some (trim raw |> String.lowercase_ascii)
      | _ -> None
    in
    let max_bytes = max 1 (get_int args "max_bytes" (20 * 1024 * 1024)) in
    let timeout_sec = max 5 (min 300 (get_int args "timeout_sec" 60)) in
    Ok (url, target_name, expected_mime, sha256, max_bytes, timeout_sec)

let parse_content_type headers_text =
  headers_text
  |> String.split_on_char '\n'
  |> List.find_map (fun line ->
         let lowered = String.lowercase_ascii (trim line) in
         if starts_with ~prefix:"content-type:" lowered then
           let raw =
             String.sub lowered 13 (String.length lowered - 13)
             |> trim
           in
           let mime =
             match String.split_on_char ';' raw with
             | first :: _ -> trim first
             | [] -> raw
           in
           if mime = "" then None else Some mime
         else
           None)

let sha256_of_file path =
  let content = In_channel.with_open_bin path In_channel.input_all in
  Digestif.SHA256.(digest_string content |> to_hex)

let maybe_remove path =
  if Sys.file_exists path then
    try
      if Sys.is_directory path then ()
      else Sys.remove path
    with _ -> ()

let download_destination config target_name =
  Filename.concat (masc_downloads_dir config) target_name

let inspect_download_json ctx args =
  match normalize_download_request args with
  | Error message -> Error message
  | Ok (url, target_name, expected_mime, sha256, max_bytes, timeout_sec) ->
      let destination_path = download_destination ctx.config target_name in
      let existing = path_info_json destination_path in
      let execute_allowed =
        match existing with
        | `Assoc fields -> (
            match List.assoc_opt "nonempty" fields with
            | Some (`Bool true) -> false
            | _ -> true)
        | _ -> false
      in
      Ok
        (`Assoc
          [
            ("action", `String "download");
            ("mode", `String "inspect");
            ("url", `String url);
            ("target_name", `String target_name);
            ("destination_path", `String destination_path);
            ("expected_mime", string_opt_json expected_mime);
            ("sha256", string_opt_json sha256);
            ("max_bytes", `Int max_bytes);
            ("timeout_sec", `Int timeout_sec);
            ("existing_destination", existing);
            ("execute_allowed", `Bool execute_allowed);
            ("command_preview", list_json [ "curl"; "--fail"; "--location"; "--output"; destination_path; url ]);
            ( "safety",
              `Assoc
                [
                  ("default_mode", `String "inspect");
                  ("writes_under", `String (masc_downloads_dir ctx.config));
                  ("confirm_required", json_bool true);
                  ("overwrite_nonempty_refused", json_bool true);
                ] );
          ])

let execute_download ctx args =
  match inspect_download_json ctx args with
  | Error message -> (false, json_error message)
  | Ok inspect_json ->
      let open Yojson.Safe.Util in
      let execute_allowed = inspect_json |> member "execute_allowed" |> to_bool in
      if not execute_allowed then
        (false, json_error "destination already exists and is non-empty")
      else
        let url = inspect_json |> member "url" |> to_string in
        let destination_path = inspect_json |> member "destination_path" |> to_string in
        let max_bytes = inspect_json |> member "max_bytes" |> to_int in
        let timeout_sec = inspect_json |> member "timeout_sec" |> to_int in
        let expected_mime = inspect_json |> member "expected_mime" |> to_string_option in
        let expected_sha256 = inspect_json |> member "sha256" |> to_string_option in
        ensure_dir (masc_downloads_dir ctx.config);
        let headers_path = destination_path ^ ".headers" in
        let tmp_path = destination_path ^ ".part" in
        maybe_remove headers_path;
        maybe_remove tmp_path;
        let argv =
          [
            "curl";
            "--fail";
            "--show-error";
            "--silent";
            "--location";
            "--max-time";
            string_of_int timeout_sec;
            "--max-filesize";
            string_of_int max_bytes;
            "--dump-header";
            headers_path;
            "--output";
            tmp_path;
            url;
          ]
        in
        match run_status ~timeout_sec:(float_of_int timeout_sec +. 5.0) argv with
        | Unix.WEXITED 0, output -> (
            try
              let bytes_downloaded =
                file_size_opt tmp_path |> Option.value ~default:0
              in
              let content_type =
                if Sys.file_exists headers_path then
                  In_channel.with_open_text headers_path In_channel.input_all
                  |> parse_content_type
                else
                  None
              in
              (match expected_mime, content_type with
              | Some expected, Some actual when not (String.equal expected actual) ->
                  maybe_remove tmp_path;
                  maybe_remove headers_path;
                  (false, json_error (Printf.sprintf "content-type mismatch: expected %s got %s" expected actual))
              | Some expected, None ->
                  maybe_remove tmp_path;
                  maybe_remove headers_path;
                  (false, json_error (Printf.sprintf "content-type missing; expected %s" expected))
              | _ ->
                  let actual_sha256 = sha256_of_file tmp_path in
                  (match expected_sha256 with
                  | Some expected when not (String.equal expected actual_sha256) ->
                      maybe_remove tmp_path;
                      maybe_remove headers_path;
                      (false, json_error "sha256 mismatch")
                  | _ ->
                      if Sys.file_exists destination_path then maybe_remove destination_path;
                      Sys.rename tmp_path destination_path;
                      maybe_remove headers_path;
                      ( true,
                        json_ok
                          [
                            ("action", `String "download");
                            ("mode", `String "execute");
                            ("url", `String url);
                            ("destination_path", `String destination_path);
                            ("bytes_downloaded", `Int bytes_downloaded);
                            ("content_type", string_opt_json content_type);
                            ("sha256", `String actual_sha256);
                            ("command_output", `String (trim output));
                          ] )))
            with
            | Eio.Cancel.Cancelled _ as e -> raise e
            | exn ->
                maybe_remove tmp_path;
                maybe_remove headers_path;
                (false, json_error (Printf.sprintf "download failed: %s" (Printexc.to_string exn))))
        | _, output ->
            maybe_remove tmp_path;
            maybe_remove headers_path;
            (false, json_error (Printf.sprintf "curl failed: %s" (trim output)))

let basename_without_git raw =
  let trimmed = trim raw in
  if String.ends_with ~suffix:".git" trimmed then
    String.sub trimmed 0 (String.length trimmed - 4)
  else
    trimmed

let normalize_repo_input repo_input =
  let repo = trim repo_input in
  if repo = "" then
    Error "repo is required"
  else if starts_with ~prefix:"https://" repo || starts_with ~prefix:"http://" repo then
    Ok repo
  else
    match String.split_on_char '/' repo with
    | [ owner; name ] when trim owner <> "" && trim name <> "" ->
        Ok (Printf.sprintf "https://github.com/%s/%s.git" (trim owner) (basename_without_git name))
    | _ ->
        Error "repo must be an https/http url or owner/repo"

let repo_slug_of_url repo_url =
  repo_url
  |> String.split_on_char '/'
  |> List.rev
  |> List.find_map (fun piece ->
         let piece = basename_without_git piece |> trim in
         if piece = "" then None else Some (sanitize_segment piece))
  |> Option.value ~default:"repo"

let normalize_clone_request args =
  let repo_input = get_string args "repo" "" in
  match normalize_repo_input repo_input with
  | Error _ as error -> error
  | Ok repo_url ->
      let branch =
        match get_string_opt args "branch" with
        | Some raw when trim raw <> "" -> Some (trim raw)
        | _ -> None
      in
      let target_name =
        match get_string_opt args "target_name" with
        | Some raw when trim raw <> "" -> sanitize_segment raw
        | _ -> repo_slug_of_url repo_url
      in
      let depth = max 1 (min 1000 (get_int args "depth" 1)) in
      let timeout_sec = max 5 (min 600 (get_int args "timeout_sec" 120)) in
      Ok (repo_url, target_name, branch, depth, timeout_sec)

let inspect_clone_json ctx args =
  match normalize_clone_request args with
  | Error message -> Error message
  | Ok (repo_url, target_name, branch, depth, timeout_sec) ->
      let destination_path =
        Filename.concat (masc_external_repos_dir ctx.config) target_name
      in
      let existing = path_info_json destination_path in
      let execute_allowed =
        match existing with
        | `Assoc fields -> (
            match List.assoc_opt "exists" fields, List.assoc_opt "nonempty" fields with
            | Some (`Bool false), _ -> true
            | Some (`Bool true), Some (`Bool false) -> true
            | _ -> false)
        | _ -> false
      in
      Ok
        (`Assoc
          [
            ("action", `String "git_clone");
            ("mode", `String "inspect");
            ("repo_url", `String repo_url);
            ("target_name", `String target_name);
            ("branch", string_opt_json branch);
            ("depth", `Int depth);
            ("timeout_sec", `Int timeout_sec);
            ("destination_path", `String destination_path);
            ("existing_destination", existing);
            ("execute_allowed", `Bool execute_allowed);
            ( "command_preview",
              list_json
                ([
                    "git";
                    "clone";
                    "--depth";
                    string_of_int depth;
                  ]
                 @
                 (match branch with
                 | Some value -> [ "--branch"; value ]
                 | None -> [])
                 @ [ repo_url; destination_path ]));
            ( "safety",
              `Assoc
                [
                  ("default_mode", `String "inspect");
                  ("writes_under", `String (masc_external_repos_dir ctx.config));
                  ("confirm_required", json_bool true);
                  ("overwrite_nonempty_refused", json_bool true);
                  ("shallow_clone_default", json_bool true);
                ] );
          ])

let execute_clone ctx args =
  match inspect_clone_json ctx args with
  | Error message -> (false, json_error message)
  | Ok inspect_json ->
      let open Yojson.Safe.Util in
      let execute_allowed = inspect_json |> member "execute_allowed" |> to_bool in
      if not execute_allowed then
        (false, json_error "destination already exists and is non-empty")
      else
        let repo_url = inspect_json |> member "repo_url" |> to_string in
        let branch = inspect_json |> member "branch" |> to_string_option in
        let depth = inspect_json |> member "depth" |> to_int in
        let timeout_sec = inspect_json |> member "timeout_sec" |> to_int in
        let destination_path = inspect_json |> member "destination_path" |> to_string in
        ensure_dir (masc_external_repos_dir ctx.config);
        let argv =
          [
            "git";
            "clone";
            "--depth";
            string_of_int depth;
          ]
          @
          (match branch with
          | Some value -> [ "--branch"; value ]
          | None -> [])
          @ [ repo_url; destination_path ]
        in
        match run_status ~timeout_sec:(float_of_int timeout_sec) argv with
        | Unix.WEXITED 0, output -> (
            match
              run_stdout [ "git"; "-C"; destination_path; "branch"; "--show-current" ],
              run_stdout [ "git"; "-C"; destination_path; "rev-parse"; "HEAD" ]
            with
            | Ok checked_out_branch, Ok head_sha ->
                ( true,
                  json_ok
                    [
                      ("action", `String "git_clone");
                      ("mode", `String "execute");
                      ("repo_url", `String repo_url);
                      ("destination_path", `String destination_path);
                      ("checked_out_branch", `String checked_out_branch);
                      ("head_sha", `String head_sha);
                      ("command_output", `String (trim output));
                    ] )
            | Error message, _ | _, Error message ->
                (false, json_error message))
        | _, output ->
            (false, json_error (Printf.sprintf "git clone failed: %s" (trim output)))

let git_top_level path =
  run_stdout [ "git"; "-C"; path; "rev-parse"; "--show-toplevel" ]

let git_branch path =
  run_stdout [ "git"; "-C"; path; "branch"; "--show-current" ]

let git_head_sha path =
  run_stdout [ "git"; "-C"; path; "rev-parse"; "HEAD" ]

let git_remote_url path =
  run_stdout [ "git"; "-C"; path; "remote"; "get-url"; "origin" ]

let git_dirty path =
  match run_stdout [ "git"; "-C"; path; "status"; "--porcelain" ] with
  | Ok output -> Ok (output <> "")
  | Error _ as error -> error

let inspect_pull_json ctx args =
  let path_arg = get_string args "path" "" |> trim in
  if path_arg = "" then
    Error "path is required"
  else
    let abs_path = relative_to_base ctx.config path_arg in
    match git_top_level abs_path with
    | Error message -> Error message
    | Ok repo_path -> (
        match repo_root ctx.config with
        | None -> Error "not in a git repository"
        | Some main_repo_root ->
            let repo_path = canonicalize_path repo_path in
            let main_repo_root = canonicalize_path main_repo_root in
            let worktree_root = Filename.concat main_repo_root ".worktrees" |> canonicalize_path in
            let external_root = masc_external_repos_dir ctx.config |> canonicalize_path in
            let location_kind, execute_allowed =
              if String.equal repo_path main_repo_root then
                ("root_checkout", false)
              else if within_dir ~root:worktree_root repo_path then
                ("worktree", true)
              else if within_dir ~root:external_root repo_path then
                ("external_repo", true)
              else
                ("other", false)
            in
            let branch = git_branch repo_path |> Result.to_option in
            let head_sha = git_head_sha repo_path |> Result.to_option in
            let dirty = git_dirty repo_path |> Result.to_option in
            let remote_url = git_remote_url repo_path |> Result.to_option in
            Ok
              (`Assoc
                [
                  ("action", `String "git_pull");
                  ("mode", `String "inspect");
                  ("requested_path", `String path_arg);
                  ("repo_path", `String repo_path);
                  ("location_kind", `String location_kind);
                  ("branch", string_opt_json branch);
                  ("head_sha", string_opt_json head_sha);
                  ("remote_url", string_opt_json remote_url);
                  ("dirty", json_bool (Option.value ~default:false dirty));
                  ("execute_allowed", `Bool execute_allowed);
                  ( "command_preview",
                    list_json [ "git"; "-C"; repo_path; "pull"; "--ff-only" ] );
                  ( "safety",
                    `Assoc
                      [
                        ("default_mode", `String "inspect");
                        ("root_checkout_refused", json_bool true);
                        ("dirty_repo_refused", json_bool true);
                        ( "allowed_prefixes",
                          list_json [ worktree_root; external_root ] );
                      ] );
                ]))

let execute_pull ctx args =
  match inspect_pull_json ctx args with
  | Error message -> (false, json_error message)
  | Ok inspect_json ->
      let open Yojson.Safe.Util in
      let execute_allowed = inspect_json |> member "execute_allowed" |> to_bool in
      let repo_path = inspect_json |> member "repo_path" |> to_string in
      let dirty = inspect_json |> member "dirty" |> to_bool in
      if not execute_allowed then
        (false, json_error "pull is only allowed for .worktrees and .masc/external/repos targets")
      else if dirty then
        (false, json_error "refusing to pull because the target repository is dirty")
      else
        let before_sha = inspect_json |> member "head_sha" |> to_string_option in
        match run_status ~timeout_sec:120.0 [ "git"; "-C"; repo_path; "pull"; "--ff-only" ] with
        | Unix.WEXITED 0, output -> (
            match git_head_sha repo_path with
            | Ok after_sha ->
                ( true,
                  json_ok
                    [
                      ("action", `String "git_pull");
                      ("mode", `String "execute");
                      ("repo_path", `String repo_path);
                      ("before_sha", string_opt_json before_sha);
                      ("after_sha", `String after_sha);
                      ( "changed",
                        `Bool
                          (match before_sha with
                          | Some value -> not (String.equal value after_sha)
                          | None -> true) );
                      ("branch", inspect_json |> member "branch");
                      ("command_output", `String (trim output));
                    ] )
            | Error message -> (false, json_error message))
        | _, output ->
            (false, json_error (Printf.sprintf "git pull failed: %s" (trim output)))

let handle_download ctx args =
  match current_mode args with
  | Error message -> (false, json_error message)
  | Ok "inspect" -> (
      match inspect_download_json ctx args with
      | Ok json -> (true, Yojson.Safe.pretty_to_string json)
      | Error message -> (false, json_error message))
  | Ok "execute" -> execute_download ctx args
  | Ok _ -> (false, json_error "unsupported mode")

let handle_git_clone ctx args =
  match current_mode args with
  | Error message -> (false, json_error message)
  | Ok "inspect" -> (
      match inspect_clone_json ctx args with
      | Ok json -> (true, Yojson.Safe.pretty_to_string json)
      | Error message -> (false, json_error message))
  | Ok "execute" -> execute_clone ctx args
  | Ok _ -> (false, json_error "unsupported mode")

let handle_git_pull ctx args =
  match current_mode args with
  | Error message -> (false, json_error message)
  | Ok "inspect" -> (
      match inspect_pull_json ctx args with
      | Ok json -> (true, Yojson.Safe.pretty_to_string json)
      | Error message -> (false, json_error message))
  | Ok "execute" -> execute_pull ctx args
  | Ok _ -> (false, json_error "unsupported mode")

let dispatch ctx ~name ~args : result option =
  match name with
  | "masc_safe_download" -> Some (handle_download ctx args)
  | "masc_safe_git_clone" -> Some (handle_git_clone ctx args)
  | "masc_safe_git_pull" -> Some (handle_git_pull ctx args)
  | _ -> None

let inspect_execute_mode_schema description =
  `Assoc
    [
      ("type", `String "string");
      ("enum", `List [ `String "inspect"; `String "execute" ]);
      ("description", `String description);
      ("default", `String "inspect");
    ]

let schemas : Types.tool_schema list =
  [
    {
      name = "masc_safe_download";
      description =
        "Inspect-first wrapper for remote downloads. inspect returns destination, safety checks, and command preview. execute writes only under .masc/downloads and can verify optional mime/sha256.";
      input_schema =
        `Assoc
          [
            ("type", `String "object");
            ( "properties",
              `Assoc
                [
                  ( "mode",
                    inspect_execute_mode_schema
                      "inspect (default) returns a preflight preview; execute performs the download." );
                  ("url", `Assoc [ ("type", `String "string") ]);
                  ("target_name", `Assoc [ ("type", `String "string") ]);
                  ("expected_mime", `Assoc [ ("type", `String "string") ]);
                  ("sha256", `Assoc [ ("type", `String "string") ]);
                  ("max_bytes", `Assoc [ ("type", `String "integer") ]);
                  ("timeout_sec", `Assoc [ ("type", `String "integer") ]);
                ] );
            ("required", `List [ `String "url" ]);
          ];
    };
    {
      name = "masc_safe_git_clone";
      description =
        "Inspect-first wrapper for shallow git clone. inspect normalizes repo input and previews the destination under .masc/external/repos. execute performs a shallow clone and returns branch/head provenance.";
      input_schema =
        `Assoc
          [
            ("type", `String "object");
            ( "properties",
              `Assoc
                [
                  ( "mode",
                    inspect_execute_mode_schema
                      "inspect (default) previews clone details; execute performs the clone." );
                  ("repo", `Assoc [ ("type", `String "string") ]);
                  ("target_name", `Assoc [ ("type", `String "string") ]);
                  ("branch", `Assoc [ ("type", `String "string") ]);
                  ("depth", `Assoc [ ("type", `String "integer") ]);
                  ("timeout_sec", `Assoc [ ("type", `String "integer") ]);
                ] );
            ("required", `List [ `String "repo" ]);
          ];
    };
    {
      name = "masc_safe_git_pull";
      description =
        "Inspect-first wrapper for ff-only git pull. inspect reports path classification, dirty state, and command preview. execute is allowed only for repos under .masc/external/repos or repo-owned .worktrees.";
      input_schema =
        `Assoc
          [
            ("type", `String "object");
            ( "properties",
              `Assoc
                [
                  ( "mode",
                    inspect_execute_mode_schema
                      "inspect (default) reports whether pull is allowed; execute performs git pull --ff-only." );
                  ("path", `Assoc [ ("type", `String "string") ]);
                ] );
            ("required", `List [ `String "path" ]);
          ];
    };
  ]
