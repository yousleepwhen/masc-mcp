(** Dashboard platform projection regression tests. *)

module Lib = Masc_mcp

open Alcotest

let test_dir () =
  let tmp = Filename.temp_file "masc_dashboard_platform" "" in
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

let test_dashboard_platform_projection () =
  let dir = test_dir () in
  let old_llama = Sys.getenv_opt "LLAMA_SERVER_URL" in
  Fun.protect
    ~finally:(fun () ->
      (match old_llama with
      | Some value -> Unix.putenv "LLAMA_SERVER_URL" value
      | None -> Unix.putenv "LLAMA_SERVER_URL" "");
      cleanup_dir dir)
    (fun () ->
      Unix.putenv "LLAMA_SERVER_URL" "http://127.0.0.1:9";
      Eio_main.run @@ fun _env ->
      let config = Room_utils.default_config dir in
      ignore (Lib.Room.init config ~agent_name:(Some "dashboard"));
      Fs_compat.mkdir_p (Filename.concat dir ".masc/config");
      Fs_compat.save_file
        (Filename.concat dir ".masc/config/demo.json")
        {|{"key":"demo","value":"ok"}|};
      let json = Lib.Dashboard_platform.json config in
      let open Yojson.Safe.Util in
      let paths = json |> member "paths" |> to_list in
      let config_inventory = json |> member "config_inventory" in
      let notes = json |> member "notes" |> member "families" |> to_list in
      let providers = json |> member "providers" |> member "providers" |> to_list in
      check bool "paths present" true (List.length paths >= 4);
      check int "config inventory count" 1
        (config_inventory |> member "count" |> to_int);
      check bool "wrapper notes present" true (List.length notes >= 3);
      check bool "provider cards present" true (List.length providers >= 1))

let () =
  run "dashboard_platform"
    [
      ("projection", [
           test_case "platform payload includes config and provider sections"
             `Quick test_dashboard_platform_projection;
         ]);
    ]
