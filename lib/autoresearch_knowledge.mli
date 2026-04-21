(** Autoresearch_knowledge — finding persistence and search for autoresearch loops.

    @since 0.1.0 *)

type confidence = High | Medium | Low

type finding = {
  id : string;
  loop_id : string;
  keeper_name : string;
  goal : string;
  hypothesis : string;
  evidence : string;
  conclusion : string;
  confidence : confidence;
  tags : string list;
  related_findings : string list;
  cycle_range : (int * int) option;
  timestamp : float;
}

val confidence_of_string : string -> confidence
val generate_finding_id : unit -> string
val record_finding : finding -> unit
val search_findings : string -> finding list
val finding_to_yojson : finding -> Yojson.Safe.t
val finding : string -> finding option
