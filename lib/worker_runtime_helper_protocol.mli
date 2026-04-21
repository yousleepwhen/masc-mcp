(** Worker_runtime_helper_protocol — helper protocol for worker runtime.

    @since 0.1.0 *)

type error_kind =
  | Spec_parse
  | Runtime
  | Timeout
  | Internal

type error_payload = {
  message : string;
  kind : error_kind;
}

val error_kind_to_string : error_kind -> string
val parse_stdout : string -> (string, error_payload) result
