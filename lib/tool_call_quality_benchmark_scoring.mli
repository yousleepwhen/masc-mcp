(** Tool_call_quality_benchmark_scoring — scoring logic for tool call benchmarks.

    @since 0.1.0 *)

val score_run :
  Tool_call_quality_benchmark_types.case ->
  Tool_call_quality_benchmark_types.run ->
  Tool_call_quality_benchmark_types.case_score
