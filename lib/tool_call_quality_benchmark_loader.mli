(** Tool_call_quality_benchmark_loader — case and run file loader for benchmarks.

    @since 0.1.0 *)

val default_case_set_path : unit -> string
val default_evidence_path : unit -> string
val load_cases_from_file : string -> Tool_call_quality_benchmark_types.case list
val load_runs_from_file : string -> Tool_call_quality_benchmark_types.run list
