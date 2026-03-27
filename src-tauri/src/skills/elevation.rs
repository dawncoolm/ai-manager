use crate::plugins;
use crate::skills::{commands, fs_utils};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use serde::{Deserialize, Serialize};
use std::fmt;
use std::fs;
use std::path::{Path, PathBuf};

#[cfg(windows)]
use std::ffi::OsStr;
#[cfg(windows)]
use std::os::windows::ffi::OsStrExt;

#[cfg(windows)]
use windows_sys::Win32::Foundation::{CloseHandle, WAIT_FAILED, WAIT_OBJECT_0};
#[cfg(windows)]
use windows_sys::Win32::System::Threading::{GetExitCodeProcess, WaitForSingleObject, INFINITE};
#[cfg(windows)]
use windows_sys::Win32::UI::Shell::{ShellExecuteExW, SEE_MASK_NOCLOSEPROCESS, SHELLEXECUTEINFOW};

const ELEVATED_ACTION_FLAG: &str = "--elevated-symlink-action";
const ELEVATED_RESULT_FLAG: &str = "--elevated-symlink-result";

#[cfg(windows)]
const ELEVATION_CANCELLED_ERROR_CODE: i32 = 1223;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum InstallOperationError {
    RequiresElevation(String),
    Message(String),
}

impl InstallOperationError {
    pub fn message(message: impl Into<String>) -> Self {
        Self::Message(message.into())
    }

    pub fn requires_elevation(&self) -> bool {
        matches!(self, Self::RequiresElevation(_))
    }
}

impl fmt::Display for InstallOperationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::RequiresElevation(message) | Self::Message(message) => f.write_str(message),
        }
    }
}

impl std::error::Error for InstallOperationError {}

impl From<String> for InstallOperationError {
    fn from(message: String) -> Self {
        Self::Message(message)
    }
}

impl From<&str> for InstallOperationError {
    fn from(message: &str) -> Self {
        Self::Message(message.to_string())
    }
}

impl From<fs_utils::SymlinkError> for InstallOperationError {
    fn from(error: fs_utils::SymlinkError) -> Self {
        if error.requires_elevation() {
            Self::RequiresElevation(error.to_string())
        } else {
            Self::Message(error.to_string())
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ElevatedSymlinkAction {
    InstallSkill {
        hub_skill_name: String,
        tool_id: String,
    },
    InstallPluginSkill {
        plugin_id: String,
        skill_dir_name: String,
        tool_id: String,
    },
    InstallPluginSkillToAll {
        plugin_id: String,
        skill_dir_name: String,
    },
    InstallPluginCommand {
        plugin_id: String,
        command_file: String,
        tool_id: String,
    },
    InstallPluginCommandToAll {
        plugin_id: String,
        command_file: String,
    },
    InstallAllPluginSkillsToAllTools {
        plugin_id: String,
    },
    InstallAllPluginCommandsToAllTools {
        plugin_id: String,
    },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ElevatedHelperArgs {
    pub action: ElevatedSymlinkAction,
    pub result_path: PathBuf,
}

#[derive(Debug, Serialize, Deserialize)]
struct ElevatedActionResult {
    success: bool,
    error: Option<String>,
}

pub fn execute_with_optional_elevation<F>(
    action: ElevatedSymlinkAction,
    operation: F,
) -> Result<(), String>
where
    F: FnOnce() -> Result<(), InstallOperationError>,
{
    match operation() {
        Ok(()) => Ok(()),
        Err(error) if error.requires_elevation() => retry_with_elevation(&action),
        Err(error) => Err(error.to_string()),
    }
}

pub fn handle_elevated_helper_args(args: &[String]) -> Option<i32> {
    let helper_args = match parse_elevated_helper_args(args) {
        Ok(Some(helper_args)) => helper_args,
        Ok(None) => return None,
        Err(error) => {
            eprintln!("{}", error);
            return Some(1);
        }
    };

    Some(run_elevated_action_helper(helper_args))
}

pub fn parse_elevated_helper_args(args: &[String]) -> Result<Option<ElevatedHelperArgs>, String> {
    let mut action_payload: Option<String> = None;
    let mut result_path: Option<PathBuf> = None;
    let mut index = 1usize;

    while index < args.len() {
        match args[index].as_str() {
            ELEVATED_ACTION_FLAG => {
                index += 1;
                let value = args
                    .get(index)
                    .ok_or_else(|| format!("Missing value for {}", ELEVATED_ACTION_FLAG))?;
                action_payload = Some(value.clone());
            }
            ELEVATED_RESULT_FLAG => {
                index += 1;
                let value = args
                    .get(index)
                    .ok_or_else(|| format!("Missing value for {}", ELEVATED_RESULT_FLAG))?;
                result_path = Some(PathBuf::from(value));
            }
            _ => {}
        }

        index += 1;
    }

    match (action_payload, result_path) {
        (None, None) => Ok(None),
        (Some(payload), Some(result_path)) => Ok(Some(ElevatedHelperArgs {
            action: decode_action_payload(&payload)?,
            result_path,
        })),
        (Some(_), None) => Err(format!("Missing {}", ELEVATED_RESULT_FLAG)),
        (None, Some(_)) => Err(format!("Missing {}", ELEVATED_ACTION_FLAG)),
    }
}

pub fn encode_action_payload(action: &ElevatedSymlinkAction) -> Result<String, String> {
    let bytes = serde_json::to_vec(action)
        .map_err(|error| format!("Failed to serialize elevated action: {}", error))?;
    Ok(URL_SAFE_NO_PAD.encode(bytes))
}

pub fn decode_action_payload(payload: &str) -> Result<ElevatedSymlinkAction, String> {
    let bytes = URL_SAFE_NO_PAD
        .decode(payload)
        .map_err(|error| format!("Failed to decode elevated action payload: {}", error))?;
    serde_json::from_slice(&bytes)
        .map_err(|error| format!("Failed to parse elevated action payload: {}", error))
}

fn dispatch_elevated_action(action: &ElevatedSymlinkAction) -> Result<(), InstallOperationError> {
    match action {
        ElevatedSymlinkAction::InstallSkill {
            hub_skill_name,
            tool_id,
        } => commands::install_skill_action(hub_skill_name, tool_id),
        ElevatedSymlinkAction::InstallPluginSkill {
            plugin_id,
            skill_dir_name,
            tool_id,
        } => plugins::commands::install_plugin_skill_action(plugin_id, skill_dir_name, tool_id),
        ElevatedSymlinkAction::InstallPluginSkillToAll {
            plugin_id,
            skill_dir_name,
        } => plugins::commands::install_plugin_skill_to_all_action(plugin_id, skill_dir_name),
        ElevatedSymlinkAction::InstallPluginCommand {
            plugin_id,
            command_file,
            tool_id,
        } => plugins::commands::install_plugin_command_action(plugin_id, command_file, tool_id),
        ElevatedSymlinkAction::InstallPluginCommandToAll {
            plugin_id,
            command_file,
        } => plugins::commands::install_plugin_command_to_all_action(plugin_id, command_file),
        ElevatedSymlinkAction::InstallAllPluginSkillsToAllTools { plugin_id } => {
            plugins::commands::install_all_plugin_skills_to_all_tools_action(plugin_id)
        }
        ElevatedSymlinkAction::InstallAllPluginCommandsToAllTools { plugin_id } => {
            plugins::commands::install_all_plugin_commands_to_all_tools_action(plugin_id)
        }
    }
}

fn run_elevated_action_helper(helper_args: ElevatedHelperArgs) -> i32 {
    let outcome = dispatch_elevated_action(&helper_args.action).map_err(|error| error.to_string());
    let result = ElevatedActionResult {
        success: outcome.is_ok(),
        error: outcome.err(),
    };

    if let Err(error) = write_helper_result(&helper_args.result_path, &result) {
        eprintln!("{}", error);
        return 1;
    }

    if result.success {
        0
    } else {
        1
    }
}

fn write_helper_result(result_path: &Path, result: &ElevatedActionResult) -> Result<(), String> {
    if let Some(parent) = result_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|error| {
                format!(
                    "Failed to create elevated result directory {}: {}",
                    parent.display(),
                    error
                )
            })?;
        }
    }

    let payload = serde_json::to_vec(result)
        .map_err(|error| format!("Failed to serialize elevated result: {}", error))?;
    fs::write(result_path, payload).map_err(|error| {
        format!(
            "Failed to write elevated result file {}: {}",
            result_path.display(),
            error
        )
    })
}

#[cfg(windows)]
fn retry_with_elevation(action: &ElevatedSymlinkAction) -> Result<(), String> {
    let result_path = create_result_path();
    let parameters = format!(
        r#"{action_flag} {payload} {result_flag} "{result_path}""#,
        action_flag = ELEVATED_ACTION_FLAG,
        payload = encode_action_payload(action)?,
        result_flag = ELEVATED_RESULT_FLAG,
        result_path = result_path.display(),
    );

    let process_exit_code = launch_elevated_helper(&parameters)?;
    let helper_result = read_helper_result(&result_path)?;
    let _ = fs::remove_file(&result_path);

    if helper_result.success {
        return Ok(());
    }

    if let Some(error) = helper_result.error {
        return Err(error);
    }

    Err(format!(
        "Elevated install failed with exit code {}.",
        process_exit_code
    ))
}

#[cfg(not(windows))]
fn retry_with_elevation(_action: &ElevatedSymlinkAction) -> Result<(), String> {
    Err("Automatic elevation is only supported on Windows.".to_string())
}

#[cfg(windows)]
fn create_result_path() -> PathBuf {
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    std::env::temp_dir().join(format!(
        "ai-manager-elevated-{}-{}.json",
        std::process::id(),
        timestamp
    ))
}

#[cfg(windows)]
fn launch_elevated_helper(parameters: &str) -> Result<u32, String> {
    let executable_path = std::env::current_exe()
        .map_err(|error| format!("Failed to resolve current executable: {}", error))?;
    let verb = wide_null("runas");
    let file = wide_null(executable_path.as_os_str());
    let arguments = wide_null(parameters);

    let mut execute_info: SHELLEXECUTEINFOW = unsafe { std::mem::zeroed() };
    execute_info.cbSize = std::mem::size_of::<SHELLEXECUTEINFOW>() as u32;
    execute_info.fMask = SEE_MASK_NOCLOSEPROCESS;
    execute_info.lpVerb = verb.as_ptr();
    execute_info.lpFile = file.as_ptr();
    execute_info.lpParameters = arguments.as_ptr();
    execute_info.nShow = 0;

    let launch_success = unsafe { ShellExecuteExW(&mut execute_info) };
    if launch_success == 0 {
        let launch_error = std::io::Error::last_os_error();
        if launch_error.raw_os_error() == Some(ELEVATION_CANCELLED_ERROR_CODE) {
            return Err("Administrator permission was not granted. Install cancelled.".to_string());
        }

        return Err(format!(
            "Failed to launch elevated install helper: {}",
            launch_error
        ));
    }

    if execute_info.hProcess.is_null() {
        return Err("Failed to obtain elevated helper process handle.".to_string());
    }

    let wait_status = unsafe { WaitForSingleObject(execute_info.hProcess, INFINITE) };
    if wait_status == WAIT_FAILED {
        let wait_error = std::io::Error::last_os_error();
        unsafe {
            CloseHandle(execute_info.hProcess);
        }
        return Err(format!(
            "Failed while waiting for elevated helper: {}",
            wait_error
        ));
    }

    if wait_status != WAIT_OBJECT_0 {
        unsafe {
            CloseHandle(execute_info.hProcess);
        }
        return Err(format!(
            "Unexpected wait status from elevated helper: {}",
            wait_status
        ));
    }

    let mut exit_code = 1u32;
    let exit_code_success = unsafe { GetExitCodeProcess(execute_info.hProcess, &mut exit_code) };
    unsafe {
        CloseHandle(execute_info.hProcess);
    }

    if exit_code_success == 0 {
        return Err(format!(
            "Failed to read elevated helper exit code: {}",
            std::io::Error::last_os_error()
        ));
    }

    Ok(exit_code)
}

#[cfg(windows)]
fn read_helper_result(result_path: &Path) -> Result<ElevatedActionResult, String> {
    let payload = fs::read(result_path).map_err(|error| {
        format!(
            "Failed to read elevated result file {}: {}",
            result_path.display(),
            error
        )
    })?;

    serde_json::from_slice(&payload).map_err(|error| {
        format!(
            "Failed to parse elevated result file {}: {}",
            result_path.display(),
            error
        )
    })
}

#[cfg(windows)]
fn wide_null(value: impl AsRef<OsStr>) -> Vec<u16> {
    value
        .as_ref()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn action_payload_round_trips() {
        let action = ElevatedSymlinkAction::InstallPluginCommand {
            plugin_id: "plugin-id".to_string(),
            command_file: "command.md".to_string(),
            tool_id: "claude".to_string(),
        };

        let payload = encode_action_payload(&action).expect("payload should encode");
        let decoded = decode_action_payload(&payload).expect("payload should decode");

        assert_eq!(decoded, action);
    }

    #[test]
    fn parse_elevated_helper_args_extracts_action_and_result_path() {
        let action = ElevatedSymlinkAction::InstallSkill {
            hub_skill_name: "skill-one".to_string(),
            tool_id: "codex".to_string(),
        };
        let payload = encode_action_payload(&action).expect("payload should encode");
        let args = vec![
            "ai-manager".to_string(),
            ELEVATED_ACTION_FLAG.to_string(),
            payload,
            ELEVATED_RESULT_FLAG.to_string(),
            "C:\\temp\\result.json".to_string(),
        ];

        let parsed = parse_elevated_helper_args(&args)
            .expect("args should parse")
            .expect("helper args should be returned");

        assert_eq!(parsed.action, action);
        assert_eq!(parsed.result_path, PathBuf::from("C:\\temp\\result.json"));
    }

    #[test]
    fn parse_elevated_helper_args_requires_both_flags() {
        let action = ElevatedSymlinkAction::InstallSkill {
            hub_skill_name: "skill-one".to_string(),
            tool_id: "codex".to_string(),
        };
        let payload = encode_action_payload(&action).expect("payload should encode");
        let args = vec![
            "ai-manager".to_string(),
            ELEVATED_ACTION_FLAG.to_string(),
            payload,
        ];

        let error = parse_elevated_helper_args(&args).expect_err("missing result flag should fail");
        assert!(error.contains(ELEVATED_RESULT_FLAG));
    }

    #[test]
    fn symlink_error_converts_to_requires_elevation_operation_error() {
        let symlink_error =
            fs_utils::SymlinkError::privilege_error("Requires administrator privileges");
        let operation_error = InstallOperationError::from(symlink_error);

        assert!(operation_error.requires_elevation());
        assert_eq!(
            operation_error.to_string(),
            "Requires administrator privileges"
        );
    }
}
