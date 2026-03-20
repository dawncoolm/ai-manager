use crate::skills::registry::get_tool_registry;
use std::path::PathBuf;

pub struct CachePath {
    pub label: &'static str,
    pub subpath: &'static str,
    pub is_file: bool,
}

pub struct CacheDefinition {
    pub tool_id: &'static str,
    pub paths: &'static [CachePath],
}

pub fn get_cache_registry() -> Vec<CacheDefinition> {
    vec![
        CacheDefinition {
            tool_id: "claude",
            paths: &[
                CachePath {
                    label: "Project conversations",
                    subpath: "projects",
                    is_file: false,
                },
                CachePath {
                    label: "Session history",
                    subpath: "history.jsonl",
                    is_file: true,
                },
            ],
        },
        CacheDefinition {
            tool_id: "codex",
            paths: &[
                CachePath {
                    label: "Session files",
                    subpath: "sessions",
                    is_file: false,
                },
                CachePath {
                    label: "Session index",
                    subpath: "session_index.jsonl",
                    is_file: true,
                },
                CachePath {
                    label: "Archived sessions",
                    subpath: "archived_sessions",
                    is_file: false,
                },
            ],
        },
        CacheDefinition {
            tool_id: "gemini",
            paths: &[CachePath {
                label: "Conversation history",
                subpath: "history",
                is_file: false,
            }],
        },
    ]
}

pub fn resolve_tool_base_dir(tool_id: &str) -> Option<PathBuf> {
    let registry = get_tool_registry();
    registry
        .into_iter()
        .find(|e| e.def.id == tool_id)
        .and_then(|e| (e.dir_resolver)())
}

pub fn resolve_tool_name(tool_id: &str) -> String {
    let registry = get_tool_registry();
    registry
        .iter()
        .find(|e| e.def.id == tool_id)
        .map(|e| e.def.name.to_string())
        .unwrap_or_else(|| tool_id.to_string())
}
