(** Tool_shard_limits — SSOT constants for tool schema size limits.

    Leaf module with no dependencies. Both tool_shard and keeper_exec_fs
    import from here to avoid dependency cycles.

    @since 0.1.0 *)

val keeper_fs_read_default_max_bytes : int
val keeper_fs_read_default_max_bytes_string : string
