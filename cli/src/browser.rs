use std::io;
use std::process::{Command, Stdio};

use crate::Result;

pub fn open(url: &str) -> Result<()> {
    let (program, args): (_, &[&str]) = if cfg!(target_os = "macos") {
        ("open", &[])
    } else if cfg!(target_os = "windows") {
        /*
         * `start` is a cmd.exe builtin rather than an executable, and it
         * takes its first quoted argument as the window title.
         */
        ("cmd", &["/c", "start", ""])
    } else {
        ("xdg-open", &[])
    };

    Command::new(program)
        .args(args)
        .arg(url)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| match error.kind() {
            io::ErrorKind::NotFound => format!("cannot open browser: {program} not found"),
            _ => format!("cannot open browser: {error}"),
        })?;

    Ok(())
}
