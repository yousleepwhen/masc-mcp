(** Coverage tests for Tool_library — pruned tool surface. *)

module Tool_library = Masc_mcp.Tool_library

let pruned_tools =
  [
    "masc_library_list";
    "masc_library_read";
    "masc_library_add";
    "masc_library_promote";
    "masc_library_search";
  ]

let test_dispatch_unknown () =
  let ctx : Tool_library.context = { agent_name = "test-agent" } in
  Alcotest.(check bool) "unknown returns None" true
    (Tool_library.dispatch ctx ~name:"unknown_tool" ~args:(`Assoc []) = None)

let test_dispatch_pruned_tools_return_none () =
  let ctx : Tool_library.context = { agent_name = "test-agent" } in
  List.iter
    (fun name ->
      Alcotest.(check bool) (name ^ " pruned") true
        (Tool_library.dispatch ctx ~name ~args:(`Assoc []) = None))
    pruned_tools

let test_schemas_empty () =
  Alcotest.(check int) "schemas empty" 0 (List.length Tool_library.schemas)

let () =
  Alcotest.run "Tool_library"
    [
      ( "pruned_surface",
        [
          Alcotest.test_case "dispatch unknown" `Quick test_dispatch_unknown;
          Alcotest.test_case "dispatch pruned tools return None" `Quick
            test_dispatch_pruned_tools_return_none;
          Alcotest.test_case "schemas empty" `Quick test_schemas_empty;
        ] );
    ]
