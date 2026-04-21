(** Verification_protocol — CDAL verification lifecycle management.

    @since 0.1.0 *)

val on_submit_for_verification :
  agent_name:string -> claim:string -> evidence:string -> string -> unit
val on_approve_verification : agent_name:string -> string -> unit
val on_reject_verification : agent_name:string -> reason:string -> string -> unit
val check_timeouts : unit -> int
