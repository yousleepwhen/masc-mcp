(** Tool_local_runtime — local LLM runtime tool dispatch.

    @since 0.1.0 *)

val schemas : Types.tool_schema list
val dispatch :
  Tool_local_runtime_core.context -> name:string -> args:Yojson.Safe.t ->
  Tool_local_runtime_core.tool_result option
val config : unit -> Yojson.Safe.t
val runtime_ollama_probe_json : unit -> Yojson.Safe.t
