(** Graphql_endpoint — GraphQL URL resolution with env var overrides.

    Resolves the GraphQL server URL from environment variables
    with normalization and scheme detection.

    @since 0.1.0 *)

val trim_trailing_slash : string -> string
val normalize_graphql_url : default_scheme:string -> string -> string
val default_railway_url : string
val railway_graphql_url : unit -> string
val default_scheme_for_override : string -> string
val graphql_url : unit -> string
