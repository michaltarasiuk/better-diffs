use std::time::Duration;

use ureq::Agent;
use ureq::http::StatusCode;

use crate::{Result, VERSION};

const TIMEOUT: Duration = Duration::from_secs(30);

const RESPONSE_LIMIT: u64 = 64 * 1024;

pub fn upload(base_url: &str, patch: &[u8]) -> Result<String> {
    let agent: Agent = Agent::config_builder()
        .timeout_global(Some(TIMEOUT))
        /*
         * The API explains a rejected patch in the response body, which
         * ureq would otherwise discard in favour of a bare status error.
         */
        .http_status_as_error(false)
        .user_agent(format!("better-diffs/{VERSION}"))
        .build()
        .into();

    let mut response = agent
        .post(format!("{base_url}/api/diffs"))
        .header("Content-Type", "text/x-patch")
        .header("Accept", "text/plain")
        .send(patch)
        .map_err(|error| match error {
            ureq::Error::BadUri(_) => format!("invalid instance URL {base_url:?}: {error}"),
            error => format!("failed to reach {base_url}: {error}"),
        })?;

    let status = response.status();
    let body = response
        .body_mut()
        .with_config()
        .limit(RESPONSE_LIMIT)
        .read_to_string()
        .map_err(|error| format!("failed to read response from {base_url}: {error}"))?;

    let message = body.trim();

    if status != StatusCode::CREATED {
        return Err(match message.is_empty() {
            true => format!("upload failed with status {status}").into(),
            false => format!("upload failed: {message}").into(),
        });
    }

    Ok(message.to_owned())
}

#[cfg(test)]
mod tests {
    use std::io::{BufRead, BufReader, Read, Write};
    use std::net::TcpListener;
    use std::thread::{self, JoinHandle};

    use super::*;

    struct Request {
        headers: Vec<String>,
        body: String,
    }

    impl Request {
        fn header(&self, name: &str) -> Option<&str> {
            self.headers.iter().find_map(|header| {
                let (key, value) = header.split_once(':')?;
                key.eq_ignore_ascii_case(name).then(|| value.trim())
            })
        }
    }

    fn serve_once(status: &str, body: &'static str) -> (String, JoinHandle<Request>) {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let base_url = format!("http://{}", listener.local_addr().unwrap());
        let status = status.to_owned();

        let handle = thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            let mut reader = BufReader::new(stream.try_clone().unwrap());

            let mut headers = Vec::new();
            loop {
                let mut line = String::new();
                reader.read_line(&mut line).unwrap();
                match line.trim_end() {
                    "" => break,
                    header => headers.push(header.to_owned()),
                }
            }

            let length = headers
                .iter()
                .find_map(|header| {
                    let (key, value) = header.split_once(':')?;
                    key.eq_ignore_ascii_case("content-length")
                        .then(|| value.trim().parse().unwrap())
                })
                .unwrap_or(0);

            let mut received = vec![0; length];
            reader.read_exact(&mut received).unwrap();

            write!(
                stream,
                "HTTP/1.1 {status}\r\nContent-Type: text/plain\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
                body.len()
            )
            .unwrap();
            stream.flush().unwrap();

            Request {
                headers,
                body: String::from_utf8(received).unwrap(),
            }
        });

        (base_url, handle)
    }

    #[test]
    fn returns_the_share_url_and_posts_the_raw_patch() {
        let (base_url, server) = serve_once("201 Created", "http://127.0.0.1/d/abc\n");

        let share_url = upload(&base_url, b"diff --git a/a b/a\n").unwrap();

        assert_eq!(share_url, "http://127.0.0.1/d/abc");

        let request = server.join().unwrap();
        assert_eq!(request.body, "diff --git a/a b/a\n");
        assert_eq!(request.header("Content-Type"), Some("text/x-patch"));
        assert_eq!(request.header("Accept"), Some("text/plain"));
        assert_eq!(
            request.header("User-Agent"),
            Some(format!("better-diffs/{VERSION}").as_str())
        );
    }

    #[test]
    fn surfaces_the_server_error_message() {
        let (base_url, server) = serve_once("400 Bad Request", "No diffs found in patch\n");

        let error = upload(&base_url, b"nonsense").unwrap_err().to_string();

        assert_eq!(error, "upload failed: No diffs found in patch");
        server.join().unwrap();
    }

    #[test]
    fn falls_back_to_the_status_when_the_body_is_empty() {
        let (base_url, server) = serve_once("500 Internal Server Error", "");

        let error = upload(&base_url, b"nonsense").unwrap_err().to_string();

        assert_eq!(error, "upload failed with status 500 Internal Server Error");
        server.join().unwrap();
    }
}
