package main

import (
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func assertUsageError(t *testing.T, err error, want string) {
	t.Helper()
	if err == nil {
		t.Fatalf("err = nil; want usageError %q", want)
	}
	if got := err.Error(); got != want {
		t.Fatalf("err = %q; want %q", got, want)
	}
	var u usageError
	if !errors.As(err, &u) {
		t.Fatalf("err = %T; want usageError", err)
	}
}

func assertError(t *testing.T, err error, want string) {
	t.Helper()
	if err == nil {
		t.Fatalf("err = nil; want %q", want)
	}
	if got := err.Error(); got != want {
		t.Fatalf("err = %q; want %q", got, want)
	}
}

func assertErrorContains(t *testing.T, err error, substr string) {
	t.Helper()
	if err == nil {
		t.Fatalf("err = nil; want substring %q", substr)
	}
	if !strings.Contains(err.Error(), substr) {
		t.Fatalf("err = %q; want substring %q", err.Error(), substr)
	}
}

func assertCommandEqual(t *testing.T, got, want command) {
	t.Helper()
	if got.help != want.help {
		t.Fatalf("help = %v; want %v", got.help, want.help)
	}
	if got.version != want.version {
		t.Fatalf("version = %v; want %v", got.version, want.version)
	}
	assertOptionsEqual(t, got.options, want.options)
}

func assertOptionsEqual(t *testing.T, got, want options) {
	t.Helper()
	if got.staged != want.staged {
		t.Fatalf("staged = %v; want %v", got.staged, want.staged)
	}
	if got.base != want.base {
		t.Fatalf("base = %q; want %q", got.base, want.base)
	}
	if got.url != want.url {
		t.Fatalf("url = %q; want %q", got.url, want.url)
	}
	if got.open != want.open {
		t.Fatalf("open = %v; want %v", got.open, want.open)
	}
	if len(got.paths) != len(want.paths) {
		t.Fatalf("paths = %v; want %v", got.paths, want.paths)
	}
	for i := range got.paths {
		if got.paths[i] != want.paths[i] {
			t.Fatalf("paths[%d] = %q; want %q", i, got.paths[i], want.paths[i])
		}
	}
}

func writeConfig(t *testing.T, dir, contents string) {
	t.Helper()
	configDir := filepath.Join(dir, "better-diffs")
	if err := os.MkdirAll(configDir, 0o755); err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(configDir, "config")
	if err := os.WriteFile(path, []byte(contents), 0o644); err != nil {
		t.Fatal(err)
	}
}

func withDefaultURL(t *testing.T, url string) {
	t.Helper()
	old := DefaultURL
	DefaultURL = url
	t.Cleanup(func() { DefaultURL = old })
}

func requireGit(t *testing.T) {
	t.Helper()
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not found in PATH")
	}
}

func runGit(t *testing.T, dir string, args ...string) {
	t.Helper()
	cmd := exec.Command("git", args...)
	cmd.Dir = dir
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("git %s in %s: %v\n%s", strings.Join(args, " "), dir, err, out)
	}
}

func initGitRepo(t *testing.T) string {
	t.Helper()
	requireGit(t)

	dir := t.TempDir()
	runGit(t, dir, "init")
	runGit(t, dir, "config", "user.email", "test@example.com")
	runGit(t, dir, "config", "user.name", "test")
	return dir
}

func chdir(t *testing.T, dir string) {
	t.Helper()
	wd, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	if err := os.Chdir(dir); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := os.Chdir(wd); err != nil {
			t.Errorf("restore working directory: %v", err)
		}
	})
}
