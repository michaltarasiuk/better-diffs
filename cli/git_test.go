package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDiff(t *testing.T) {
	requireGit(t)

	tests := []struct {
		name    string
		setup   func(t *testing.T, dir string) options
		wantErr string
	}{
		{
			name: "unstaged changes",
			setup: func(t *testing.T, dir string) options {
				writeFile(t, dir, "file.txt", "before\n")
				runGit(t, dir, "add", "file.txt")
				runGit(t, dir, "commit", "-m", "init")
				writeFile(t, dir, "file.txt", "after\n")
				return options{}
			},
		},
		{
			name: "staged changes",
			setup: func(t *testing.T, dir string) options {
				writeFile(t, dir, "file.txt", "before\n")
				runGit(t, dir, "add", "file.txt")
				runGit(t, dir, "commit", "-m", "init")
				writeFile(t, dir, "file.txt", "after\n")
				runGit(t, dir, "add", "file.txt")
				return options{staged: true}
			},
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
		},
		{
			name: "no changes",
			setup: func(t *testing.T, dir string) options {
				writeFile(t, dir, "file.txt", "same\n")
				runGit(t, dir, "add", "file.txt")
				runGit(t, dir, "commit", "-m", "init")
				return options{}
			},
			wantErr: "No changes found",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			dir := initGitRepo(t)
			opts := tc.setup(t, dir)

			chdir(t, dir)
			got, err := diff(opts.base, opts.staged, opts.paths)
			if tc.wantErr != "" {
				assertError(t, err, tc.wantErr)
				return
			}
			if err != nil {
				t.Fatalf("diff(...) = %v; want nil err", err)
			}
			if len(got) == 0 {
				t.Fatal("diff(...) returned empty patch")
			}
		})
	}
}

func TestDiffGitMissing(t *testing.T) {
	t.Setenv("PATH", "")
	_, err := diff("", false, nil)
	assertError(t, err, "Git is required")
}

func writeFile(t *testing.T, dir, name, contents string) {
	t.Helper()
	path := filepath.Join(dir, name)
	if err := os.WriteFile(path, []byte(contents), 0o644); err != nil {
		t.Fatal(err)
	}
}
