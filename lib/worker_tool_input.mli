(** Worker_tool_input — shared JSON helpers for Agent SDK tool input parsing.

    @since 0.1.0 *)

val json_to_string : Yojson.Safe.t -> string
val extract_string : string -> Yojson.Safe.t -> (string, string) result
val extract_optional_string : string -> Yojson.Safe.t -> (string option, string) result
val extract_tasks_array :
  Yojson.Safe.t -> ((string * string) list, string) result
val extract_float : string -> Yojson.Safe.t -> float option
