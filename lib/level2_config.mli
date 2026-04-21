(** Level2_config — externalized runtime-tunable constants.

    Reads environment variables for drift detection, lock contention,
    and Hebbian learning parameters.

    @since 0.1.0 *)

val get_env_float : string -> float -> float

module Drift_guard : sig
  val default_threshold : unit -> float
  type weights = { jaccard : float; cosine : float }
  val weights : unit -> weights
end

module Lock : sig
  val warn_threshold_ms : unit -> float
end

module Hebbian : sig
  val learning_rate : unit -> float
  val decay_rate : unit -> float
  val min_weight : unit -> float
  val max_weight : unit -> float
end

val to_json : unit -> Yojson.Safe.t
val print_config : unit -> unit
