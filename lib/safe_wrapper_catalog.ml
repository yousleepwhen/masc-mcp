type wrapper_status =
  | Active
  | Planned

type wrapper_family = {
  id : string;
  label : string;
  description : string;
  tool_names : string list;
  default_mode : string;
  mutating : bool;
  confirm_required : bool;
  status : wrapper_status;
  disabled_reason : string option;
  surfaces : string list;
}

let status_to_string = function
  | Active -> "active"
  | Planned -> "planned"

let internal_surfaces =
  [ "spawned_agent_mcp"; "local_worker"; "keeper_standard" ]

let families : wrapper_family list =
  [
    {
      id = "safe_remote_fetch";
      label = "Safe Remote Fetch";
      description =
        "Inspect-first remote download wrapper. Execute mode writes only under .masc/downloads and verifies size, optional mime, and optional sha256.";
      tool_names = [ "masc_safe_download" ];
      default_mode = "inspect";
      mutating = true;
      confirm_required = true;
      status = Active;
      disabled_reason = None;
      surfaces = internal_surfaces;
    };
    {
      id = "safe_repo_sync";
      label = "Safe Repo Sync";
      description =
        "Inspect-first git wrappers for shallow clone and ff-only pull. Execute mode is restricted to .masc/external/repos and repo-owned .worktrees.";
      tool_names = [ "masc_safe_git_clone"; "masc_safe_git_pull" ];
      default_mode = "inspect";
      mutating = true;
      confirm_required = true;
      status = Active;
      disabled_reason = None;
      surfaces = internal_surfaces;
    };
    {
      id = "vision_inspect";
      label = "Vision Inspect";
      description =
        "Planned slot for image-aware inspection flows. Cataloged now so operators can see the intended surface and disabled reason.";
      tool_names = [];
      default_mode = "inspect";
      mutating = false;
      confirm_required = false;
      status = Planned;
      disabled_reason =
        Some
          "Vision wrappers are not wired yet because the current OAS/provider stack in this repo has no confirmed image-input execution path.";
      surfaces = internal_surfaces;
    };
  ]

let family_to_json (family : wrapper_family) =
  `Assoc
    [
      ("id", `String family.id);
      ("label", `String family.label);
      ("description", `String family.description);
      ("tool_names", `List (List.map (fun name -> `String name) family.tool_names));
      ("tool_count", `Int (List.length family.tool_names));
      ("default_mode", `String family.default_mode);
      ("mutating", `Bool family.mutating);
      ("confirm_required", `Bool family.confirm_required);
      ("status", `String (status_to_string family.status));
      ( "disabled_reason",
        match family.disabled_reason with
        | Some reason -> `String reason
        | None -> `Null );
      ("surfaces", `List (List.map (fun item -> `String item) family.surfaces));
    ]

let catalog_json () =
  `Assoc
    [
      ("generated_at", `String (Types.now_iso ()));
      ("families", `List (List.map family_to_json families));
    ]

let active_tool_names =
  families
  |> List.filter (fun family -> family.status = Active)
  |> List.concat_map (fun family -> family.tool_names)

