(** Prompt_defaults — auto-discovers prompt metadata from markdown frontmatter.

    Call [bootstrap_runtime] during server startup to scan config/prompts/
    and register all prompts that have YAML frontmatter.

    @since 0.1.0 *)

val init : unit -> unit
val bootstrap_runtime : workspace_path:string -> base_path:string -> string
