(** Tool_call_quality_benchmark_scoring — scoring logic for tool call benchmarks.

    @since 0.1.0 *)

val score_run :
  cases:Tool_call_quality_benchmark_types.benchmark_case list ->
  Tool_call_quality_benchmark_types.evidence_run ->
  Tool_call_quality_benchmark_types.case_score option
