(** Tool_local_runtime_http — HTTP helpers for local LLM runtime.

    Provides curl-based HTTP GET/POST with status code extraction.

    @since 0.1.0 *)

val http_get_text_with_status :
  ?timeout_sec:int -> string -> (int * string, string) result
val http_get_text_with_status_with_headers :
  ?timeout_sec:int -> ?headers:(string * string) list ->
  string -> (int * string, string) result
val http_post_json_text_with_status_with_headers :
  timeout_sec:int -> ?headers:(string * string) list ->
  url:string -> body_json:string -> unit ->
  (int * string, string) result
val format_errors : string -> string
