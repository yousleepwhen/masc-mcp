(** Dashboard_platform — merged config/provider/platform observability payload. *)

let string_opt_json = function
  | Some value -> `String value
  | None -> `Null

let int_opt_json = function
  | Some value -> `Int value
  | None -> `Null

let float_opt_json = function
  | Some value -> `Float value
  | None -> `Null

let path_entry_json ~key ~label path =
  let exists = Sys.file_exists path in
  let is_directory = if exists then (try Sys.is_directory path with _ -> false) else false in
  let size_bytes =
    if exists && not is_directory then
      try Some (Unix.stat path).Unix.st_size with _ -> None
    else
      None
  in
  let modified_at =
    if exists then
      try Some (Dashboard_utils.iso_of_unix (Unix.stat path).Unix.st_mtime) with _ -> None
    else
      None
  in
  `Assoc
    [
      ("key", `String key);
      ("label", `String label);
      ("path", `String path);
      ("exists", `Bool exists);
      ("is_directory", `Bool is_directory);
      ("size_bytes", int_opt_json size_bytes);
      ("modified_at", string_opt_json modified_at);
    ]

let config_inventory_json config_dir =
  let files =
    if Sys.file_exists config_dir && Sys.is_directory config_dir then
      Sys.readdir config_dir
      |> Array.to_list
      |> List.filter_map (fun name ->
             if String.ends_with ~suffix:".json" name then
               let path = Filename.concat config_dir name in
               Some (path_entry_json ~key:name ~label:name path)
             else
               None)
      |> List.sort (fun left right ->
             let key json =
               match json with
               | `Assoc fields -> (
                   match List.assoc_opt "key" fields with
                   | Some (`String value) -> value
                   | _ -> "")
               | _ -> ""
             in
             String.compare (key left) (key right))
    else
      []
  in
  `Assoc [ ("count", `Int (List.length files)); ("files", `List files) ]

let runtime_params_json () =
  let params = Runtime_params.registry () in
  let items =
    List.map
      (fun (key, current, default, has_override) ->
        `Assoc
          [
            ("key", `String key);
            ("current", current);
            ("default", default);
            ("has_override", `Bool has_override);
          ])
      params
  in
  `Assoc
    [
      ("parameters", `List items);
      ("surfaces", Governance_registry.surfaces_json ());
    ]

let provider_metrics_dir config =
  Filename.concat (Filename.concat (Room_utils.masc_dir config) "metrics") "providers"

let provider_probe_path config provider =
  Filename.concat (provider_metrics_dir config) (provider ^ ".jsonl")

let parse_recent_jsonl path ~max_lines =
  if not (Sys.file_exists path) then
    []
  else
    Keeper_memory.read_file_tail_lines path ~max_bytes:120000 ~max_lines
    |> List.filter_map (fun line ->
           try Some (Yojson.Safe.from_string line) with Yojson.Json_error _ -> None)

let latest_probe_time path =
  match List.rev (parse_recent_jsonl path ~max_lines:1) with
  | json :: _ -> (
      match Yojson.Safe.Util.member "sampled_at_unix" json with
      | `Float value -> Some value
      | `Int value -> Some (float_of_int value)
      | _ -> None)
  | [] -> None

let append_probe_sample_if_stale config provider sample =
  let path = provider_probe_path config provider in
  let now_ts = Unix.gettimeofday () in
  let should_append =
    match latest_probe_time path with
    | Some ts -> now_ts -. ts >= 30.0
    | None -> true
  in
  if should_append then begin
    Fs_compat.mkdir_p (provider_metrics_dir config);
    Fs_compat.append_file path (Yojson.Safe.to_string sample ^ "\n")
  end

let recent_probe_summary provider recent_samples =
  let open Yojson.Safe.Util in
  let total = List.length recent_samples in
  let latency_values =
    recent_samples
    |> List.filter_map (fun sample ->
           match sample |> member "latency_ms" with
           | `Int value -> Some (float_of_int value)
           | `Float value -> Some value
           | _ -> None)
  in
  let avg_latency_ms =
      match latency_values with
      | [] -> None
      | values ->
          Some
          ((values |> List.fold_left ( +. ) 0.0) /. float_of_int (List.length values))
  in
  let latest = match recent_samples with sample :: _ -> Some sample | [] -> None in
  `Assoc
    [
      ("provider", `String provider);
      ("sample_count", `Int total);
      ("avg_latency_ms", float_opt_json avg_latency_ms);
      ( "last_status",
        match latest with
        | Some sample -> sample |> member "status"
        | None -> `Null );
      ( "last_error",
        match latest with
        | Some sample -> sample |> member "error"
        | None -> `Null );
      ( "last_runtime_blocker",
        match latest with
        | Some sample -> sample |> member "runtime_blocker"
        | None -> `Null );
      ( "last_sample_at",
        match latest with
        | Some sample -> sample |> member "sampled_at"
        | None -> `Null );
    ]

let provider_samples_json config provider_inventory verify_json =
  let verify_provider_error =
    let open Yojson.Safe.Util in
    match verify_json |> member "runtimes" with
    | `List ((`Assoc _ as row) :: _) -> row |> member "provider_error" |> to_string_option
    | _ -> None
  in
  let verify_runtime_blocker =
    Yojson.Safe.Util.(verify_json |> member "runtime_blocker" |> to_string_option)
  in
  let providers =
    Dashboard_provider_runs.provider_snapshots ()
    |> List.map (fun (snapshot : Dashboard_provider_runs.provider_snapshot) ->
           let started_at = Unix.gettimeofday () in
           let latency_ms =
             if String.equal snapshot.provider "llama" then
               Some (int_of_float ((Unix.gettimeofday () -. started_at) *. 1000.0))
             else
               None
           in
           let error =
             if String.equal snapshot.provider "llama" then verify_provider_error
             else snapshot.note
           in
           let runtime_blocker =
             if String.equal snapshot.provider "llama" then verify_runtime_blocker
             else None
           in
           let sample =
             `Assoc
               [
                 ("provider", `String snapshot.provider);
                 ("status", `String snapshot.status);
                 ("available", `Bool snapshot.available);
                 ("endpoint_url", string_opt_json snapshot.endpoint_url);
                 ("default_model", string_opt_json snapshot.default_model);
                 ("latency_ms", int_opt_json latency_ms);
                 ("error", string_opt_json error);
                 ("runtime_blocker", string_opt_json runtime_blocker);
                 ( "sample_source",
                   `String
                     (if String.equal snapshot.provider "llama" then
                        "runtime_verify"
                      else
                        "provider_inventory") );
                 ("sampled_at", `String (Types.now_iso ()));
                 ("sampled_at_unix", `Float (Unix.gettimeofday ()));
               ]
           in
           append_probe_sample_if_stale config snapshot.provider sample;
           let recent = parse_recent_jsonl (provider_probe_path config snapshot.provider) ~max_lines:12 in
           `Assoc
             [
               ("provider", `String snapshot.provider);
               ("kind", `String snapshot.kind);
               ("runtime_kind", `String snapshot.runtime_kind);
               ("auth_kind", `String snapshot.auth_kind);
               ("status", `String snapshot.status);
               ("available", `Bool snapshot.available);
               ("supports_single_agent_run", `Bool snapshot.supports_single_agent_run);
               ("default_model", string_opt_json snapshot.default_model);
               ("models", `List (List.map (fun model -> `String model) snapshot.models));
               ("source", `String snapshot.source);
               ("endpoint_url", string_opt_json snapshot.endpoint_url);
               ("note", string_opt_json snapshot.note);
               ("current_probe", sample);
               ("history_summary", recent_probe_summary snapshot.provider recent);
             ])
  in
  `Assoc
    [
      ("inventory", provider_inventory);
      ( "model_catalog_status",
        try
          let endpoints = Discovery_cache.get_cached_or_refresh () in
          `Assoc
            [
              ("count", `Int (List.length endpoints));
              ("summary", Discovery_cache.summary_to_json endpoints);
              ("cache_age_seconds", `Float (Discovery_cache.cache_age_seconds ()));
            ]
        with _ ->
          `Assoc
            [
              ("count", `Int 0);
              ("summary", `Null);
              ("cache_age_seconds", `Null);
            ] );
      ("local_runtime_status", Tool_local_runtime_status.runtime_status_json ~include_models:true ());
      ("local_runtime_verify", verify_json);
      ("providers", `List providers);
      ( "recent_samples",
        `List
          (Dashboard_provider_runs.provider_snapshots ()
           |> List.concat_map (fun (snapshot : Dashboard_provider_runs.provider_snapshot) ->
                  parse_recent_jsonl
                    (provider_probe_path config snapshot.provider)
                    ~max_lines:4)) );
    ]

let json (config : Room.config) =
  let masc_dir = Room_utils.masc_dir config in
  let config_dir = Filename.concat masc_dir "config" in
  let provider_inventory = Dashboard_provider_runs.provider_inventory_json () in
  let verify_json = Tool_local_runtime_verify.runtime_verify_json () in
  let paths =
    [
      path_entry_json ~key:"masc_dir" ~label:".masc" masc_dir;
      path_entry_json ~key:"masc_config_dir" ~label:".masc/config" config_dir;
      path_entry_json ~key:"keepers_manifest_dir" ~label:"config/keepers"
        (Filename.concat config.Room.base_path "config/keepers");
      path_entry_json ~key:"cascade_config" ~label:"config/cascade.json"
        (Filename.concat config.Room.base_path "config/cascade.json");
      path_entry_json ~key:"lodge_env" ~label:"config/lodge.env"
        (Filename.concat config.Room.base_path "config/lodge.env");
    ]
  in
  `Assoc
    [
      ("generated_at", `String (Types.now_iso ()));
      ("paths", `List paths);
      ("config_inventory", config_inventory_json config_dir);
      ("runtime_params", runtime_params_json ());
      ("providers", provider_samples_json config provider_inventory verify_json);
      ("notes", Safe_wrapper_catalog.catalog_json ());
    ]
