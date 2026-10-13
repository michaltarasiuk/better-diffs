package main

import (
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
				commitFile(t, dir, "a.txt", "old\n")
				writeFile(t, dir, "a.txt", "new\n")
				return options{}
			},
			want: []string{"diff --git a/a.txt b/a.txt", "+new"},
		},
		{
			name: "staged changes",
			setup: func(t *testing.T, dir string) options {
				commitFile(t, dir, "a.txt", "old\n")
				writeFile(t, dir, "a.txt", "new\n")
				runGit(t, dir, "add", "a.txt")
				return options{staged: true}
			},
			want: []string{"+new"},
		},
		{
			name: "path limit",
			setup: func(t *testing.T, dir string) options {
				writeFile(t, dir, "a.txt", "old\n")
				writeFile(t, dir, "b.txt", "old\n")
				runGit(t, dir, "add", ".")
				runGit(t, dir, "commit", "-m", "init")
				writeFile(t, dir, "a.txt", "new\n")
				writeFile(t, dir, "b.txt", "new\n")
				return options{paths: []string{"a.txt"}}
			},
			want:    []string{"+++ b/a.txt"},
			notWant: []string{"+++ b/b.txt"},
		},
		{
			name: "untracked file",
			setup: func(t *testing.T, dir string) options {
				commitFile(t, dir, "a.txt", "old\n")
				writeFile(t, dir, "b.txt", "new\n")
				return options{}
			},
			want: []string{"diff --git a/b.txt b/b.txt", "+++ b/b.txt", "+new"},
		},
		{
			name: "ignored file",
			setup: func(t *testing.T, dir string) options {
				commitFile(t, dir, ".gitignore", "c.txt\n")
				writeFile(t, dir, "b.txt", "new\n")
				writeFile(t, dir, "c.txt", "new\n")
				return options{}
			},
			want:    []string{"+++ b/b.txt"},
			notWant: []string{"+++ b/c.txt"},
		},
		{
			name: "untracked path limit",
			setup: func(t *testing.T, dir string) options {
				commitFile(t, dir, "a.txt", "old\n")
				writeFile(t, dir, "a/c.txt", "new\n")
				writeFile(t, dir, "b/c.txt", "new\n")
				return options{paths: []string{"a/"}}
			},
			want:    []string{"+++ b/a/c.txt"},
			notWant: []string{"+++ b/b/c.txt"},
		},
		{
			name: "untracked file from a subdirectory",
			setup: func(t *testing.T, dir string) options {
				commitFile(t, dir, "a/a.txt", "old\n")
				writeFile(t, dir, "a/a.txt", "new\n")
				writeFile(t, dir, "a/b.txt", "new\n")
				return options{}
			},
			cwd: "a",
			want: []string{
				"diff --git a/a/a.txt b/a/a.txt",
				"diff --git a/a/b.txt b/a/b.txt",
			},
		},
		{
			name: "staged skips untracked files",
			setup: func(t *testing.T, dir string) options {
				commitFile(t, dir, "a.txt", "old\n")
				writeFile(t, dir, "a.txt", "new\n")
				runGit(t, dir, "add", "a.txt")
				writeFile(t, dir, "b.txt", "new\n")
				return options{staged: true}
			},
			want:    []string{"+++ b/a.txt"},
			notWant: []string{"+++ b/b.txt"},
		},
		{
			name: "user diff config",
			setup: func(t *testing.T, dir string) options {
				runGit(t, dir, "config", "diff.noprefix", "true")
				runGit(t, dir, "config", "color.diff", "always")
				commitFile(t, dir, "a.txt", "old\n")
				writeFile(t, dir, "a.txt", "new\n")
				writeFile(t, dir, "b.txt", "new\n")
				return options{}
			},
			want: []string{
				"diff --git a/a.txt b/a.txt",
				"diff --git a/b.txt b/b.txt",
			},
			notWant: []string{"\x1b["},
		},
		{
			name: "unknown base",
			setup: func(t *testing.T, dir string) options {
				commitFile(t, dir, "a.txt", "old\n")
				return options{base: "nope"}
			},
			wantErr: "Bad revision 'nope'",
		},
		{
			name: "no changes",
			setup: func(t *testing.T, dir string) options {
				commitFile(t, dir, "a.txt", "old\n")
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
