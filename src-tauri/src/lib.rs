mod cache;
mod mcp;
mod plugins;
mod skills;

pub fn handle_startup_args(args: &[String]) -> Option<i32> {
    skills::elevation::handle_elevated_helper_args(args)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            skills::commands::scan_ai_tools,
            skills::commands::list_skills,
            skills::commands::list_commands,
            skills::commands::list_all_skills,
            skills::commands::read_skill,
            skills::commands::get_hub_skills,
            skills::commands::install_skill,
            skills::commands::remove_skill,
            skills::commands::remove_skill_from_all,
            skills::commands::toggle_skill,
            skills::commands::read_config_file,
            skills::commands::read_command_file,
            skills::commands::detect_editors,
            skills::commands::open_in_editor,
            skills::commands::remove_command,
            cache::commands::get_cache_info,
            cache::commands::clear_tool_cache,
            cache::commands::clear_all_caches,
            plugins::commands::add_plugin,
            plugins::commands::add_plugin_local,
            plugins::commands::add_plugin_github,
            plugins::commands::list_plugins,
            plugins::commands::remove_plugin,
            plugins::commands::update_plugin,
            plugins::commands::list_plugin_contents,
            plugins::commands::install_plugin_skill,
            plugins::commands::install_plugin_skill_to_all,
            plugins::commands::install_plugin_command,
            plugins::commands::install_plugin_command_to_all,
            plugins::commands::install_all_plugin_skills_to_all_tools,
            plugins::commands::install_all_plugin_commands_to_all_tools,
            plugins::commands::remove_plugin_skill,
            plugins::commands::remove_plugin_command,
            plugins::marketplace_commands::fetch_marketplace,
            plugins::marketplace_commands::import_marketplace_plugins,
            plugins::marketplace_commands::list_marketplaces,
            plugins::marketplace_commands::update_marketplace,
            plugins::marketplace_commands::remove_marketplace,
            mcp::commands::scan_mcp_tools,
            mcp::commands::read_mcp_servers,
            mcp::commands::add_mcp_server,
            mcp::commands::remove_mcp_server,
            mcp::commands::update_mcp_server,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
