(** Worker_verification — cross-agent verification for worker outputs.

    Wraps worker run_results in OAS Verified_output and uses
    verifier_oas (cheap model) for independent verification.

    @since 0.1.0 *)

type verified_result = {
  run_result : Worker_container_types.run_result;
  verified_output : Oas.Verified_output.verified Oas.Verified_output.output;
  verifier_verdict : Verifier_oas.verdict;
}

type verification_outcome =
  | Verified of verified_result
  | Unverified of {
      run_result : Worker_container_types.run_result;
      reason : string;
      verifier_verdict : Verifier_oas.verdict option;
    }

val verify_worker_result :
  goal:string -> Worker_container_types.run_result -> verification_outcome
