import dedent from 'dedent';

import {env} from '@/lib/env';

const REPO = 'michaltarasiuk/better-diffs';

export function GET() {
  const script = dedent`
    #!/bin/sh
    # better-diffs installer
    #
    # Downloads the CLI for this machine and points it at ${env.BASE_URL}.
    #
    #   BASE_URL='${env.BASE_URL}'
    #   curl -fsSL "$BASE_URL/install.sh" | sh
    #
    # ENVIRONMENT
    #   BETTER_DIFFS_BIN       Install directory (default: ~/.local/bin)
    #   BETTER_DIFFS_VERSION   Release tag to install (default: latest)

    set -eu

    REPO='${REPO}'
    BASE_URL='${env.BASE_URL}'
    BIN_DIR="\${BETTER_DIFFS_BIN:-$HOME/.local/bin}"
    CONFIG_DIR="\${XDG_CONFIG_HOME:-$HOME/.config}/better-diffs"
    VERSION="\${BETTER_DIFFS_VERSION:-latest}"

    die() {
      echo "$1" >&2
      exit 1
    }

    command -v curl >/dev/null 2>&1 || die 'curl is required'
    command -v tar >/dev/null 2>&1 || die 'tar is required'

    case "$(uname -s)" in
      Darwin) os='darwin' ;;
      Linux) os='linux' ;;
      *)
        die "Unsupported OS: $(uname -s)"
        ;;
    esac

    case "$(uname -m)" in
      x86_64 | amd64) arch='amd64' ;;
      arm64 | aarch64) arch='arm64' ;;
      *) die "Unsupported architecture: $(uname -m)" ;;
    esac

    archive="better-diffs_\${os}_\${arch}.tar.gz"

    if [ "$VERSION" = 'latest' ]; then
      download_url="https://github.com/$REPO/releases/latest/download"
    else
      download_url="https://github.com/$REPO/releases/download/$VERSION"
    fi

    tmp=$(mktemp -d)
    trap 'rm -rf "$tmp"' EXIT

    echo "Downloading $archive..."
    curl -fsSL "$download_url/$archive" -o "$tmp/$archive" ||
      die "Failed to download $archive from $download_url"

    if curl -fsSL "$download_url/checksums.txt" -o "$tmp/checksums.txt"; then
      if command -v sha256sum >/dev/null 2>&1; then
        checksum='sha256sum'
      elif command -v shasum >/dev/null 2>&1; then
        checksum='shasum -a 256'
      else
        checksum=''
      fi

      if [ -n "$checksum" ]; then
        expected=$(awk -v file="$archive" '$2 == file {print $1}' "$tmp/checksums.txt")
        [ -n "$expected" ] || die "No checksum published for $archive"

        actual=$($checksum "$tmp/$archive" | cut -d ' ' -f 1)
        [ "$expected" = "$actual" ] || die "Checksum mismatch for $archive"

        echo 'Checksum verified.'
      else
        echo 'Skipping checksum: no sha256sum or shasum found.' >&2
      fi
    fi

    tar -xzf "$tmp/$archive" -C "$tmp"
    [ -f "$tmp/better-diffs" ] || die 'Archive did not contain a better-diffs binary'

    mkdir -p "$BIN_DIR"
    mv "$tmp/better-diffs" "$BIN_DIR/better-diffs"
    chmod +x "$BIN_DIR/better-diffs"

    mkdir -p "$CONFIG_DIR"
    echo "url=$BASE_URL" >"$CONFIG_DIR/config"

    echo "Installed better-diffs to $BIN_DIR/better-diffs"
    echo "Uploads will go to $BASE_URL"

    case ":$PATH:" in
      *":$BIN_DIR:"*) ;;
      *) echo "Add $BIN_DIR to your PATH to run better-diffs." ;;
    esac
  `;

  return new Response(script, {
    headers: {
      'Content-Type': 'text/x-shellscript; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
