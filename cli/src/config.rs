use std::env;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use crate::Result;

pub fn resolve_base_url(flag_url: Option<&str>) -> Result<String> {
    let env_url = env::var("BETTER_DIFFS_URL").ok();
    let configured = match config_path() {
        Some(path) => read_configured_url(&path)?,
        None => None,
    };
    let default = option_env!("BETTER_DIFFS_DEFAULT_URL");

    pick_base_url(flag_url, env_url.as_deref(), configured.as_deref(), default).ok_or_else(|| {
        "no instance configured; pass --url, set BETTER_DIFFS_URL, or write url= to config".into()
    })
}

fn pick_base_url(
    flag_url: Option<&str>,
    env_url: Option<&str>,
    configured: Option<&str>,
    default: Option<&str>,
) -> Option<String> {
    Some(
        [flag_url, env_url, configured, default]
            .into_iter()
            .flatten()
            .find(|url| !url.is_empty())?
            .trim_end_matches('/')
            .to_owned(),
    )
}

/*
 * Resolved by hand rather than through a platform config directory, which on
 * macOS would be ~/Library/Application Support. The installer writes the
 * config from POSIX shell, so both sides have to agree on the XDG location.
 */
fn config_path() -> Option<PathBuf> {
    let dir = match env::var_os("XDG_CONFIG_HOME").filter(|dir| !dir.is_empty()) {
        Some(dir) => PathBuf::from(dir),
        None if cfg!(windows) => PathBuf::from(env::var_os("APPDATA")?),
        None => PathBuf::from(env::var_os("HOME")?).join(".config"),
    };

    Some(dir.join("better-diffs").join("config"))
}

fn read_configured_url(path: &Path) -> Result<Option<String>> {
    let contents = match fs::read_to_string(path) {
        Ok(contents) => contents,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(format!("failed to read {}: {error}", path.display()).into()),
    };

    Ok(contents.lines().find_map(|line| {
        let (key, value) = line.split_once('=')?;
        (key.trim() == "url").then(|| value.trim().to_owned())
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    struct TempDir(PathBuf);

    impl TempDir {
        fn new(name: &str) -> Self {
            let dir = env::temp_dir().join(format!("better-diffs-{name}-{}", std::process::id()));
            fs::create_dir_all(&dir).unwrap();
            Self(dir)
        }

        fn write(&self, name: &str, contents: &str) -> PathBuf {
            let path = self.0.join(name);
            fs::write(&path, contents).unwrap();
            path
        }
    }

    impl Drop for TempDir {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn flag_beats_environment_beats_config_beats_default() {
        let flag = Some("http://127.0.0.1:8001");
        let env = Some("http://127.0.0.1:8002");
        let configured = Some("http://127.0.0.1:8003");
        let default = Some("http://127.0.0.1:8004");

        assert_eq!(
            pick_base_url(flag, env, configured, default),
            Some("http://127.0.0.1:8001".to_owned())
        );
        assert_eq!(
            pick_base_url(None, env, configured, default),
            Some("http://127.0.0.1:8002".to_owned())
        );
        assert_eq!(
            pick_base_url(None, None, configured, default),
            Some("http://127.0.0.1:8003".to_owned())
        );
        assert_eq!(
            pick_base_url(None, None, None, default),
            Some("http://127.0.0.1:8004".to_owned())
        );
    }

    #[test]
    fn ignores_empty_sources_and_trims_trailing_slashes() {
        assert_eq!(
            pick_base_url(Some(""), Some("http://127.0.0.1:8002/"), None, None,),
            Some("http://127.0.0.1:8002".to_owned())
        );
    }

    #[test]
    fn returns_none_when_nothing_is_configured() {
        assert_eq!(pick_base_url(None, None, None, None), None);
    }

    #[test]
    fn reads_the_url_key_from_the_config_file() {
        let dir = TempDir::new("config");
        let path = dir.write("config", "# comment\nurl = http://127.0.0.1:8003\n");

        assert_eq!(
            read_configured_url(&path).unwrap(),
            Some("http://127.0.0.1:8003".to_owned())
        );
    }

    #[test]
    fn treats_a_missing_config_file_as_unset() {
        let dir = TempDir::new("missing");

        assert_eq!(read_configured_url(&dir.0.join("absent")).unwrap(), None);
    }
}
