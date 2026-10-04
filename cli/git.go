package main

import (
	"bufio"
	"bytes"
	"errors"
	"fmt"
	"os/exec"
	"strings"
	"unicode"
	"unicode/utf8"
)

/*
 * User config such as diff.noprefix, diff.external, or color.diff=always
 * changes the patch format, and the server only parses plain unified diffs
 * with a/ and b/ prefixes.
 */
var patchFlags = []string{
	"--no-color",
	"--no-ext-diff",
	"--no-textconv",
	"--src-prefix=a/",
	"--dst-prefix=b/",
}

func diff(base string, staged bool, paths []string) ([]byte, error) {
	/*
	 * Outside a repository git diff falls back to --no-index and prints its
	 * whole usage text, so check for a work tree first.
	 */
	root, err := git("", "rev-parse", "--show-toplevel")
	if err != nil {
		return nil, err
	}

	patch, err := git("", diffArgs(base, staged, paths)...)
	if err != nil {
		return nil, err
	}

	if !staged {
		untracked, err := untrackedDiff(strings.TrimSpace(string(root)), paths)
		if err != nil {
			return nil, err
		}
		patch = append(patch, untracked...)
	}

	if len(bytes.TrimSpace(patch)) == 0 {
		return nil, errors.New("No changes found")
	}
	return patch, nil
}

func diffArgs(base string, staged bool, paths []string) []string {
	args := append([]string{"diff"}, patchFlags...)
	if staged {
		args = append(args, "--staged")
	}
	if base != "" {
		args = append(args, base)
	}
	return append(append(args, "--"), paths...)
}

/*
 * git diff skips untracked files. Each one is diffed against /dev/null from
 * the repository root so its headers use root-relative paths like the tracked
 * changes do. Git maps /dev/null to NUL on Windows.
 */
func untrackedDiff(root string, paths []string) ([]byte, error) {
	args := []string{"ls-files", "--others", "--exclude-standard", "--full-name", "-z", "--"}
	out, err := git("", append(args, paths...)...)
	if err != nil {
		return nil, err
	}

	var patch []byte
	for _, name := range strings.Split(string(out), "\x00") {
		if name == "" {
			continue
		}
		fileDiff, err := diffNewFile(root, name)
		if err != nil {
			return nil, err
		}
		patch = append(patch, fileDiff...)
	}
	return patch, nil
}

func diffNewFile(root, name string) ([]byte, error) {
	args := append([]string{"diff", "--no-index"}, patchFlags...)
	cmd := exec.Command("git", append(args, "--", "/dev/null", name)...)
	cmd.Dir = root
	out, err := cmd.Output()

	/*
	 * --no-index implies --exit-code, so a file with content exits 1.
	 */
	var exitErr *exec.ExitError
	if errors.As(err, &exitErr) && exitErr.ExitCode() == 1 {
		return out, nil
	}
	if err != nil {
		return nil, gitErr(err)
	}
	return out, nil
}

func git(dir string, args ...string) ([]byte, error) {
	cmd := exec.Command("git", args...)
	cmd.Dir = dir
	out, err := cmd.Output()
	if err != nil {
		return nil, gitErr(err)
	}
	return out, nil
}

func gitErr(err error) error {
	if errors.Is(err, exec.ErrNotFound) {
		return errors.New("Git is required")
	}
	var exitErr *exec.ExitError
	if errors.As(err, &exitErr) {
		if msg := gitMessage(exitErr.Stderr); msg != "" {
			return errors.New(msg)
		}
		return fmt.Errorf("Git exited with %v", exitErr.ProcessState)
	}
	return fmt.Errorf("Run git: %w", err)
}

/*
 * Git prints lowercase "fatal: " and "error: " lines, sometimes after hints
 * and warnings. Only that line is useful after the "better-diffs: " prefix.
 */
func gitMessage(stderr []byte) string {
	scanner := bufio.NewScanner(bytes.NewReader(stderr))
	for scanner.Scan() {
		line := scanner.Text()
		for _, prefix := range []string{"fatal: ", "error: "} {
			if msg, ok := strings.CutPrefix(line, prefix); ok {
				return capitalize(strings.TrimSpace(msg))
			}
		}
	}
	return capitalize(strings.TrimSpace(string(stderr)))
}

func capitalize(s string) string {
	r, size := utf8.DecodeRuneInString(s)
	if r == utf8.RuneError {
		return s
	}
	return string(unicode.ToUpper(r)) + s[size:]
}
