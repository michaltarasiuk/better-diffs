package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestDiff(t *testing.T) {
	requireGit(t)

	tests := []struct {
		name    string
		setup   func(t *testing.T, dir string) options
		cwd     string
		want    []string
		notWant []string
		wantErr string
	}{
		{
			name: "unstaged changes",
			setup: func(t *testing.T, dir string) options {
				commitFile(t, dir, "file.txt", "before\n")
				writeFile(t, dir, "file.txt", "after\n")
				return options{}
			},
			want: []string{"diff --git a/file.txt b/file.txt", "+after"},
		},
		{
			name: "staged changes",
			setup: func(t *testing.T, dir string) options {
				commitFile(t, dir, "file.txt", "before\n")
				writeFile(t, dir, "file.txt", "after\n")
				runGit(t, dir, "add", "file.txt")
				return options{staged: true}
			},
			want: []string{"+after"},
		},
		{
			name: "path limit",
			setup: func(t *testing.T, dir string) options {
				writeFile(t, dir, "keep.txt", "keep\n")
				writeFile(t, dir, "skip.txt", "skip\n")
				runGit(t, dir, "add", ".")
				runGit(t, dir, "commit", "-m", "init")
				writeFile(t, dir, "keep.txt", "keep changed\n")
				writeFile(t, dir, "skip.txt", "skip changed\n")
				return options{paths: []string{"keep.txt"}}
			},
			want:    []string{"keep.txt"},
			notWant: []string{"skip.txt"},
		},
		{
			name: "untracked file",
			setup: func(t *testing.T, dir string) options {
				commitFile(t, dir, "file.txt", "before\n")
				writeFile(t, dir, "new.txt", "new\n")
				return options{}
			},
			want: []string{"diff --git a/new.txt b/new.txt", "+++ b/new.txt", "+new"},
		},
		{
			name: "ignored file",
			setup: func(t *testing.T, dir string) options {
				commitFile(t, dir, ".gitignore", "*.log\n")
				writeFile(t, dir, "debug.log", "noise\n")
				writeFile(t, dir, "new.txt", "new\n")
				return options{}
			},
			want:    []string{"new.txt"},
			notWant: []string{"debug.log"},
		},
		{
			name: "untracked path limit",
			setup: func(t *testing.T, dir string) options {
				commitFile(t, dir, "file.txt", "before\n")
				writeFile(t, dir, "keep/new.txt", "keep\n")
				writeFile(t, dir, "skip/new.txt", "skip\n")
				return options{paths: []string{"keep/"}}
			},
			want:    []string{"keep/new.txt"},
			notWant: []string{"skip/new.txt"},
		},
		{
			name: "untracked file from a subdirectory",
			setup: func(t *testing.T, dir string) options {
				commitFile(t, dir, "sub/file.txt", "before\n")
				writeFile(t, dir, "sub/file.txt", "after\n")
				writeFile(t, dir, "sub/new.txt", "new\n")
				return options{}
			},
			cwd: "sub",
			want: []string{
				"diff --git a/sub/file.txt b/sub/file.txt",
				"diff --git a/sub/new.txt b/sub/new.txt",
			},
		},
		{
			name: "staged skips untracked files",
			setup: func(t *testing.T, dir string) options {
				commitFile(t, dir, "file.txt", "before\n")
				writeFile(t, dir, "file.txt", "after\n")
				runGit(t, dir, "add", "file.txt")
				writeFile(t, dir, "new.txt", "new\n")
				return options{staged: true}
			},
			want:    []string{"file.txt"},
			notWant: []string{"new.txt"},
		},
		{
			name: "user diff config",
			setup: func(t *testing.T, dir string) options {
				runGit(t, dir, "config", "diff.noprefix", "true")
				runGit(t, dir, "config", "color.diff", "always")
				commitFile(t, dir, "file.txt", "before\n")
				writeFile(t, dir, "file.txt", "after\n")
				writeFile(t, dir, "new.txt", "new\n")
				return options{}
			},
			want: []string{
				"diff --git a/file.txt b/file.txt",
				"diff --git a/new.txt b/new.txt",
			},
			notWant: []string{"\x1b["},
		},
		{
			name: "unknown base",
			setup: func(t *testing.T, dir string) options {
				commitFile(t, dir, "file.txt", "before\n")
				return options{base: "nope"}
			},
			wantErr: "Bad revision 'nope'",
		},
		{
			name: "no changes",
			setup: func(t *testing.T, dir string) options {
				commitFile(t, dir, "file.txt", "same\n")
				return options{}
			},
			wantErr: "No changes found",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			dir := initGitRepo(t)
			opts := tc.setup(t, dir)

			chdir(t, filepath.Join(dir, tc.cwd))
			got, err := diff(opts.base, opts.staged, opts.paths)
			if tc.wantErr != "" {
				assertError(t, err, tc.wantErr)
				return
			}
			if err != nil {
				t.Fatalf("diff(...) = %v; want nil err", err)
			}
			patch := string(got)
			for _, s := range tc.want {
				if !strings.Contains(patch, s) {
					t.Errorf("patch missing %q\n%s", s, patch)
				}
			}
			for _, s := range tc.notWant {
				if strings.Contains(patch, s) {
					t.Errorf("patch contains %q\n%s", s, patch)
				}
			}
		})
	}
}

func TestDiffOutsideRepo(t *testing.T) {
	requireGit(t)
	dir := t.TempDir()
	t.Setenv("GIT_CEILING_DIRECTORIES", filepath.Dir(dir))
	chdir(t, dir)

	_, err := diff("", false, nil)
	assertErrorContains(t, err, "Not a git repository")
}

func TestDiffGitMissing(t *testing.T) {
	t.Setenv("PATH", "")
	_, err := diff("", false, nil)
	assertError(t, err, "Git is required")
}

func TestGitMessage(t *testing.T) {
	tests := []struct {
		stderr string
		want   string
	}{
		{
			stderr: "fatal: bad revision 'nope'\n",
			want:   "Bad revision 'nope'",
		},
		{
			stderr: "warning: something\nhint: try this\nerror: pathspec 'x' did not match\n",
			want:   "Pathspec 'x' did not match",
		},
		{
			stderr: "unexpected output\n",
			want:   "Unexpected output",
		},
		{
			stderr: "",
			want:   "",
		},
	}

	for _, tc := range tests {
		t.Run(tc.stderr, func(t *testing.T) {
			if got := gitMessage([]byte(tc.stderr)); got != tc.want {
				t.Fatalf("gitMessage(%q) = %q; want %q", tc.stderr, got, tc.want)
			}
		})
	}
}

func commitFile(t *testing.T, dir, name, contents string) {
	t.Helper()
	writeFile(t, dir, name, contents)
	runGit(t, dir, "add", name)
	runGit(t, dir, "commit", "-m", "init")
}

func writeFile(t *testing.T, dir, name, contents string) {
	t.Helper()
	path := filepath.Join(dir, name)
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(contents), 0o644); err != nil {
		t.Fatal(err)
	}
}
