package main

import (
	"errors"
	"fmt"
	"io"
	"log"
	"os"
	"runtime"
)

// Version is set at link time with -ldflags "-X main.Version=...".
var Version = "0.1.0"

// DefaultURL is the fallback instance when no flag, env, or config is set.
// Set at link time with -ldflags "-X main.DefaultURL=...".
var DefaultURL = ""

const usageLine = "better-diffs [options] [--] [<path>...]"

const usage = `Create shareable links for code diffs

USAGE
  ` + usageLine + `

OPTIONS
  --staged       Diff staged changes
  --base <ref>   Diff against a specific ref
  --url <url>    Upload to a specific better-diffs instance
  --open, -o     Open the URL in your browser
  --version      Print the version
  --help, -h     Show this help

ENVIRONMENT
  BETTER_DIFFS_URL   Instance to upload to, unless --url is given
  BROWSER            Command used to open URLs with --open

CONFIG
  Read from ${XDG_CONFIG_HOME:-~/.config}/better-diffs/config as key=value
  lines. Recognized keys: url

EXAMPLES
  better-diffs
  better-diffs --staged --open
  better-diffs --base main -- src/
`

func main() {
	log.SetFlags(0)
	if err := run(os.Args[1:], os.Stdout); err != nil {
		var u usageError
		if errors.As(err, &u) {
			dieUsage(err)
		}
		die(err)
	}
}

func run(args []string, stdout io.Writer) error {
	cmd, err := parseArgs(args)
	if err != nil {
		return err
	}
	if cmd.help {
		return writeUsage(stdout)
	}
	if cmd.version {
		_, err := fmt.Fprint(stdout, versionLine())
		return err
	}

	baseURL, err := resolveBaseURL(cmd.options.url)
	if err != nil {
		return err
	}

	patch, err := gitDiff(cmd.options.base, cmd.options.staged, cmd.options.paths)
	if err != nil {
		return err
	}

	shareURL, err := upload(baseURL, Version, patch)
	if err != nil {
		return err
	}

	if _, err := fmt.Fprintln(stdout, shareURL); err != nil {
		return err
	}
	if cmd.options.open {
		return openBrowser(shareURL)
	}
	return nil
}

func versionLine() string {
	return fmt.Sprintf("better-diffs version %s %s/%s\n", Version, runtime.GOOS, runtime.GOARCH)
}

func writeUsage(w io.Writer) error {
	_, err := io.WriteString(w, usage)
	return err
}
