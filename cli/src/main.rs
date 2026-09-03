mod browser;
mod config;
mod git;
mod upload;

use std::env;
use std::io::{self, Write};
use std::process::ExitCode;

pub type Error = Box<dyn std::error::Error>;
pub type Result<T> = std::result::Result<T, Error>;

pub const VERSION: &str = match option_env!("BETTER_DIFFS_VERSION") {
    Some(version) => version,
    None => env!("CARGO_PKG_VERSION"),
};

const USAGE: &str = "\
Create shareable links for code diffs

USAGE
  better-diffs [options] [--] [<path>...]

OPTIONS
  --staged       Diff staged changes
  --base <ref>   Diff against a specific ref
  --url <url>    Upload to a specific better-diffs instance
  --open, -o     Open the URL in your browser
  --version      Print the version
  --help, -h     Show this help

ENVIRONMENT
  BETTER_DIFFS_URL   Instance to upload to, unless --url is given

CONFIG
  Read from ${XDG_CONFIG_HOME:-~/.config}/better-diffs/config as key=value
  lines. Recognized keys: url

EXAMPLES
  better-diffs
  better-diffs --staged --open
  better-diffs --base main -- src/
";

fn main() -> ExitCode {
    if let Err(error) = run(env::args().skip(1), &mut io::stdout()) {
        eprintln!("{error}");
        return ExitCode::FAILURE;
    }
    ExitCode::SUCCESS
}

fn run(args: impl IntoIterator<Item = String>, stdout: &mut impl Write) -> Result<()> {
    let options = match parse_args(args)? {
        Command::Help => return Ok(write!(stdout, "{USAGE}")?),
        Command::Version => return Ok(writeln!(stdout, "{VERSION}")?),
        Command::Diff(options) => options,
    };

    let base_url = config::resolve_base_url(options.url.as_deref())?;
    let patch = git::diff(options.base.as_deref(), options.staged, &options.paths)?;
    let share_url = upload::upload(&base_url, &patch)?;

    writeln!(stdout, "{share_url}")?;

    if options.open {
        browser::open(&share_url)?;
    }
    Ok(())
}

#[derive(Debug, PartialEq)]
enum Command {
    Help,
    Version,
    Diff(Options),
}

#[derive(Debug, Default, PartialEq)]
struct Options {
    staged: bool,
    base: Option<String>,
    url: Option<String>,
    open: bool,
    paths: Vec<String>,
}

fn parse_args(args: impl IntoIterator<Item = String>) -> Result<Command> {
    let mut options = Options::default();
    let mut args = args.into_iter();

    while let Some(arg) = args.next() {
        /*
         * Parsing stops at the first path so that a file named like an
         * option still reaches git.
         */
        let Some(flag) = arg.strip_prefix('-').filter(|flag| !flag.is_empty()) else {
            options.paths.push(arg);
            options.paths.extend(args);
            break;
        };
        if flag == "-" {
            options.paths.extend(args);
            break;
        }

        let (name, value) = match flag.trim_start_matches('-').split_once('=') {
            Some((name, value)) => (name, Some(value.to_owned())),
            None => (flag.trim_start_matches('-'), None),
        };

        match name {
            "staged" => options.staged = takes_no_value(value, &arg)?,
            "open" | "o" => options.open = takes_no_value(value, &arg)?,
            "base" => options.base = Some(take_value(value, &mut args, &arg)?),
            "url" => options.url = Some(take_value(value, &mut args, &arg)?),
            "help" | "h" => return Ok(Command::Help),
            "version" => return Ok(Command::Version),
            _ => return Err(format!("unknown option: {arg}").into()),
        }
    }

    Ok(Command::Diff(options))
}

fn takes_no_value(value: Option<String>, arg: &str) -> Result<bool> {
    match value {
        Some(_) => Err(format!("option takes no value: {arg}").into()),
        None => Ok(true),
    }
}

fn take_value(
    value: Option<String>,
    rest: &mut impl Iterator<Item = String>,
    arg: &str,
) -> Result<String> {
    value
        .or_else(|| rest.next())
        .ok_or_else(|| format!("missing value for {arg}").into())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(args: &[&str]) -> Result<Command> {
        parse_args(args.iter().map(|arg| (*arg).to_owned()))
    }

    #[test]
    fn help_and_version_short_circuit() {
        assert_eq!(parse(&["--help"]).unwrap(), Command::Help);
        assert_eq!(parse(&["-h"]).unwrap(), Command::Help);
        assert_eq!(parse(&["--version"]).unwrap(), Command::Version);
    }

    #[test]
    fn collects_flags_and_paths() {
        let command = parse(&[
            "--staged",
            "--base",
            "main",
            "-o",
            "--",
            "src/",
            "README.md",
        ]);

        assert_eq!(
            command.unwrap(),
            Command::Diff(Options {
                staged: true,
                base: Some("main".to_owned()),
                url: None,
                open: true,
                paths: vec!["src/".to_owned(), "README.md".to_owned()],
            })
        );
    }

    #[test]
    fn accepts_inline_values() {
        let command = parse(&["--base=main", "--url=http://127.0.0.1:3000"]);

        assert_eq!(
            command.unwrap(),
            Command::Diff(Options {
                base: Some("main".to_owned()),
                url: Some("http://127.0.0.1:3000".to_owned()),
                ..Options::default()
            })
        );
    }

    #[test]
    fn treats_arguments_after_the_first_path_as_paths() {
        let command = parse(&["src/", "--staged"]);

        assert_eq!(
            command.unwrap(),
            Command::Diff(Options {
                paths: vec!["src/".to_owned(), "--staged".to_owned()],
                ..Options::default()
            })
        );
    }

    #[test]
    fn rejects_unknown_flags() {
        let error = parse(&["--bogus"]).unwrap_err().to_string();

        assert_eq!(error, "unknown option: --bogus");
    }

    #[test]
    fn rejects_a_missing_flag_value() {
        let error = parse(&["--base"]).unwrap_err().to_string();

        assert_eq!(error, "missing value for --base");
    }

    #[test]
    fn help_is_written_to_stdout() {
        let mut stdout = Vec::new();

        run(["--help".to_owned()], &mut stdout).unwrap();

        assert_eq!(String::from_utf8(stdout).unwrap(), USAGE);
    }
}
