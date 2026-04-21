(** Tool_suspend — agent suspension and circuit breaker tools.

    Part of MASC Social v4 Tier 1 security layer.

    @since 0.6.0 *)

type context = {
  config : Coord.config;
  caller_agent : string option;
}

val schemas : Types.tool_schema list
val dispatch : context -> name:string -> args:Yojson.Safe.t -> Types.tool_result option
val check_can_join : agent_id:string -> (unit, string) result
