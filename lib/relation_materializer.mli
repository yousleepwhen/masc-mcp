(** Relation_materializer — agent relationship recording via GraphQL.

    Records [COLLABORATED_WITH] edges in Neo4j using alias-batched
    GraphQL mutations. Runs in detached Eio fibers.

    @since 2.112.0 *)

val on_agent_leave : leaving_agent:string -> active_agents:string list -> unit
val on_task_done : assignee:string -> active_agents:string list -> unit
