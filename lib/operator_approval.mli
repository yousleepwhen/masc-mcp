(** Operator_approval — OAS Approval pipeline for operator action confirmation.

    Centralizes confirm_required logic with typed risk levels.

    @since 0.1.0 *)

val high_risk_actions : string list
val allowed_actions : string list
val risk_of_action : string -> Oas.Approval.risk_level
val is_allowed : string -> bool
val confirm_required : string -> bool
val pipeline : Oas.Approval.t
val evaluate_action :
  action_type:string -> agent_name:string -> turn:int -> Oas.Hooks.approval_decision
