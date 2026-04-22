(** Tool_local_runtime_core — core local LLM runtime interaction.

    @since 0.1.0 *)

type context = {
  config : Coord.config;
  agent_name : string;
}

type tool_result = bool * string

val fetch_models_at : string -> (string * string list, string) result
