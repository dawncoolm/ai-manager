use std::fmt;
use std::fs;
use std::path::Path;

#[cfg(windows)]
const WINDOWS_SYMLINK_PRIVILEGE_ERROR_CODE: i32 = 1314;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SymlinkErrorKind {
    RequiresElevation,
    Other,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SymlinkError {
    kind: SymlinkErrorKind,
    message: String,
}

impl SymlinkError {
    pub fn privilege_error(message: impl Into<String>) -> Self {
        Self {
            kind: SymlinkErrorKind::RequiresElevation,
            message: message.into(),
        }
    }

    pub fn other(message: impl Into<String>) -> Self {
        Self {
            kind: SymlinkErrorKind::Other,
            message: message.into(),
        }
    }

    pub fn requires_elevation(&self) -> bool {
        matches!(self.kind, SymlinkErrorKind::RequiresElevation)
    }
}

impl fmt::Display for SymlinkError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.message)
    }
}

impl std::error::Error for SymlinkError {}

pub fn is_symlink(path: &Path) -> bool {
    match fs::symlink_metadata(path) {
        Ok(meta) => meta.file_type().is_symlink(),
        Err(_) => false,
    }
}

pub fn resolve_symlink(path: &Path) -> Option<String> {
    if is_symlink(path) {
        fs::read_link(path)
            .ok()
            .map(|p| p.to_string_lossy().to_string())
    } else {
        None
    }
}

pub fn is_symlink_privilege_error(error: &std::io::Error) -> bool {
    #[cfg(windows)]
    {
        error.raw_os_error() == Some(WINDOWS_SYMLINK_PRIVILEGE_ERROR_CODE)
    }

    #[cfg(not(windows))]
    {
        let _ = error;
        false
    }
}

fn map_symlink_error(error: std::io::Error) -> SymlinkError {
    if is_symlink_privilege_error(&error) {
        SymlinkError::privilege_error(
            "Requires Developer Mode or administrator privileges to create symlinks. \
             Please enable Developer Mode in Windows Settings > Developer options.",
        )
    } else {
        SymlinkError::other(format!("Failed to create symlink: {}", error))
    }
}

pub fn create_skill_symlink(source: &Path, target: &Path) -> Result<(), SymlinkError> {
    if target.exists() {
        return Err(SymlinkError::other(format!(
            "Target already exists: {}",
            target.display()
        )));
    }

    if !source.exists() {
        return Err(SymlinkError::other(format!(
            "Source does not exist: {}",
            source.display()
        )));
    }

    #[cfg(unix)]
    {
        std::os::unix::fs::symlink(source, target).map_err(map_symlink_error)
    }

    #[cfg(windows)]
    {
        std::os::windows::fs::symlink_dir(source, target).map_err(map_symlink_error)
    }
}

pub fn create_file_symlink(source: &Path, target: &Path) -> Result<(), SymlinkError> {
    if target.exists() {
        return Err(SymlinkError::other(format!(
            "Target already exists: {}",
            target.display()
        )));
    }

    if !source.exists() {
        return Err(SymlinkError::other(format!(
            "Source does not exist: {}",
            source.display()
        )));
    }

    #[cfg(unix)]
    {
        std::os::unix::fs::symlink(source, target).map_err(map_symlink_error)
    }

    #[cfg(windows)]
    {
        std::os::windows::fs::symlink_file(source, target).map_err(map_symlink_error)
    }
}

pub fn remove_file_or_symlink(path: &Path) -> Result<(), String> {
    if is_symlink(path) || path.is_file() {
        fs::remove_file(path).map_err(|e| format!("Failed to remove file: {}", e))
    } else {
        Err(format!("Path is not a file or symlink: {}", path.display()))
    }
}

pub fn remove_skill_dir(path: &Path) -> Result<(), String> {
    if is_symlink(path) {
        // Remove symlink itself, not its target
        #[cfg(windows)]
        {
            fs::remove_dir(path).map_err(|e| format!("Failed to remove symlink: {}", e))
        }
        #[cfg(unix)]
        {
            fs::remove_file(path).map_err(|e| format!("Failed to remove symlink: {}", e))
        }
    } else if path.is_dir() {
        fs::remove_dir_all(path).map_err(|e| format!("Failed to remove directory: {}", e))
    } else {
        Err(format!("Path is not a directory: {}", path.display()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(windows)]
    #[test]
    fn detects_windows_symlink_privilege_error() {
        let error = std::io::Error::from_raw_os_error(WINDOWS_SYMLINK_PRIVILEGE_ERROR_CODE);
        assert!(is_symlink_privilege_error(&error));
    }

    #[cfg(not(windows))]
    #[test]
    fn non_windows_never_marks_privilege_error() {
        let error = std::io::Error::from_raw_os_error(1314);
        assert!(!is_symlink_privilege_error(&error));
    }
}
