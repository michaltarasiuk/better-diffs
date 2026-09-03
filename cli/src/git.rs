use std::io;
use std::process::Command;

use crate::{Error, Result};

pub fn diff(base: Option<&str>, staged: bool, paths: &[String]) -> Result<Vec<u8>> {
    let mut command = Command::new("git");
    command.arg("diff");

    if let Some(base) = base {
        command.arg(base);
    }
    if staged {
        command.arg("--staged");
    }
    command.arg("--").args(paths);

    let output = command.output().map_err(|error| -> Error {
        if error.kind() == io::ErrorKind::NotFound {
            "git is required".into()
        } else {
            format!("failed to run git diff: {error}").into()
        }
    })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let message = stderr.trim();

        return Err(match message.is_empty() {
            true => format!("git diff exited with {}", output.status).into(),
            false => message.into(),
        });
    }

    if output.stdout.iter().all(u8::is_ascii_whitespace) {
        return Err("No changes found".into());
    }

    Ok(output.stdout)
}
