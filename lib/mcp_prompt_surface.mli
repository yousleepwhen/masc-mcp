(** Mcp_prompt_surface — prompt surface for MCP tool queries.

    @since 0.1.0 *)

type prompt_argument = {
  name : string;
  description : string;
  required : bool;
}

type prompt_def = {
  name : string;
  description : string;
  arguments : prompt_argument list;
}

val prompt_defs : unit -> prompt_def list
val prompt_json : prompt_def -> Yojson.Safe.t
val get_json : unit -> Yojson.Safe.t
val prompt_argument : string -> Yojson.Safe.t
