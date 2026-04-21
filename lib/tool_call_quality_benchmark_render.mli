(** Tool_call_quality_benchmark_render — JSON rendering for benchmark results.

    Converts benchmark data structures to JSON and CSV formats.

    @since 0.1.0 *)

val benchmark_summary_to_yojson : Tool_call_quality_benchmark_types.benchmark_summary -> Yojson.Safe.t
val case_score_to_yojson : Tool_call_quality_benchmark_types.case_score -> Yojson.Safe.t
val json_check_to_yojson : Tool_call_quality_benchmark_types.json_check -> Yojson.Safe.t
val summary_row_to_yojson : Tool_call_quality_benchmark_types.summary_row -> Yojson.Safe.t
val summary_rows_to_csv : Tool_call_quality_benchmark_types.summary_row list -> string
