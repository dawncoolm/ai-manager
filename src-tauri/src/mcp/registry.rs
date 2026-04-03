use std::path::PathBuf;

pub struct McpToolDef {
    pub tool_id: &'static str,
    pub tool_name: &'static str,
    pub dir_resolver: fn() -> Option<PathBuf>,
    pub config_filename: &'static str,
    pub servers_key: &'static str,
}

fn home_relative(dir_name: &str) -> Option<PathBuf> {
    dirs::home_dir().map(|h| h.join(dir_name))
}

pub fn get_mcp_registry() -> Vec<McpToolDef> {
    vec![
        McpToolDef {
            tool_id: "claude",
            tool_name: "Claude Code",
            dir_resolver: || home_relative(".claude"),
            config_filename: "settings.json",
            servers_key: "mcpServers",
        },
        McpToolDef {
            tool_id: "cursor",
            tool_name: "Cursor",
            dir_resolver: || home_relative(".cursor"),
            config_filename: "mcp.json",
            servers_key: "mcpServers",
        },
        McpToolDef {
            tool_id: "gemini",
            tool_name: "Google Gemini",
            dir_resolver: || home_relative(".gemini"),
            config_filename: "settings.json",
            servers_key: "mcpServers",
        },
        McpToolDef {
            tool_id: "codebuddy",
            tool_name: "CodeBuddy",
            dir_resolver: || home_relative(".codebuddy"),
            config_filename: "mcp.json",
            servers_key: "mcpServers",
        },
        McpToolDef {
            tool_id: "lingma",
            tool_name: "Lingma",
            dir_resolver: || home_relative(".lingma"),
            config_filename: "lingma_mcp.json",
            servers_key: "mcpServers",
        },
        McpToolDef {
            tool_id: "kiro",
            tool_name: "Kiro",
            dir_resolver: || home_relative(".kiro"),
            config_filename: "settings/mcp.json",
            servers_key: "mcpServers",
        },
        McpToolDef {
            tool_id: "codex",
            tool_name: "Codex (OpenAI)",
            dir_resolver: || home_relative(".codex"),
            config_filename: "mcp.json",
            servers_key: "mcpServers",
        },
        McpToolDef {
            tool_id: "coding_copilot",
            tool_name: "CodingCopilot",
            dir_resolver: || home_relative(".codingCopilot"),
            config_filename: "mcp.json",
            servers_key: "mcpServers",
        },
    ]
}
