(** Http_protocol_detect — HTTP/1.1 vs HTTP/2 detection via connection preface.

    Peeks at the first bytes of a newly accepted connection using
    [MSG_PEEK] to determine protocol without consuming data.

    @since 0.1.0 *)

type protocol =
  | Http1
  | Http2

val h2_preface_prefix : string
val h2_preface_len : int
val detect_from_fd : Unix.file_descr -> (protocol, string) result
val detect : _ Eio.Net.stream_socket -> (protocol, string) result
val protocol_to_string : protocol -> string
