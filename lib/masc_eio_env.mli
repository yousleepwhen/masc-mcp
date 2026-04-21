(** Masc_eio_env — module-level Eio environment for OAS HTTP calls.

    Set once at server startup via [init]. Used by OAS provider completions
    which need cohttp-eio HTTP transport.

    @since 2.130.0 *)

(** {1 Types} *)

type t = {
  sw : Eio.Switch.t;
  net : [ `Generic | `Unix ] Eio.Net.ty Eio.Resource.t;
  clock : float Eio.Time.clock_ty Eio.Resource.t option;
}

(** {1 Lifecycle} *)

val init :
  sw:Eio.Switch.t ->
  net:[ `Generic | `Unix ] Eio.Net.ty Eio.Resource.t ->
  ?clock:float Eio.Time.clock_ty Eio.Resource.t ->
  unit ->
  unit
val get : unit -> t
val get_opt : unit -> t option
