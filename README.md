# better-diffs

Share your current changes with teammates without creating a PR. Teammates can view the diff and leave comments.

<picture>
  <source
    media="(prefers-color-scheme: dark)"
    srcset="docs/annotation-form-dark.png"
  />
  <source
    media="(prefers-color-scheme: light)"
    srcset="docs/annotation-form-light.png"
  />
  <img
    alt="Comment annotation form on a shared diff"
    src="docs/annotation-form-light.png"
  />
</picture>

## How it works

A CLI generates a shareable URL for your local changes. The link expires after one day from the last visit.

## Install

```sh
curl -fsSL "$BASE_URL/install.sh" | sh
```

The installer downloads a prebuilt binary for your platform from [GitHub Releases](https://github.com/michaltarasiuk/better-diffs/releases), verifies its checksum, and installs it to `~/.local/bin`. Make sure that directory is on your `PATH`.

Because the installer is served by the instance you install from, it also records that instance in your config, so installing from a self-hosted deployment configures itself.

## Usage

```sh
better-diffs                       # unstaged changes
better-diffs --staged              # staged changes
better-diffs --base main -- src/   # against a ref, limited to a path
better-diffs --open                # open the link in your browser
```

| Flag           | Description                   |
| -------------- | ----------------------------- |
| `--staged`     | Diff staged changes           |
| `--base <ref>` | Diff against a specific ref   |
| `--url <url>`  | Upload to a specific instance |
| `--open`, `-o` | Open the URL in the browser   |
| `--version`    | Print the version             |
| `--help`, `-h` | Show help                     |

### Choosing an instance

The CLI resolves which server to upload to in this order:

1. `--url`
2. `BETTER_DIFFS_URL`
3. `url=` in `${XDG_CONFIG_HOME:-~/.config}/better-diffs/config`, written by the installer

If none of those are set, the CLI exits with an error. Official release binaries can bake in a default at compile time via `BETTER_DIFFS_DEFAULT_URL`.

## Development

The web app is Next.js; run it with `bun run dev` and check it with `bun run check`.

The CLI is a Rust program in [`cli/`](cli). Build and test it with:

```sh
cd cli
cargo test
cargo build --release
```

Releases are cut by tagging: pushing a `v*` tag builds the CLI for every platform in CI, writes `checksums.txt`, and publishes a GitHub Release. The tag supplies the version the binary reports, so `Cargo.toml` never needs bumping for a release.
