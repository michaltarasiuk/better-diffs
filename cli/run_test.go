package main

import (
	"bytes"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRunHelp(t *testing.T) {
	var stdout bytes.Buffer
	if err := run([]string{"--help"}, &stdout); err != nil {
		t.Fatalf("run(--help) = %v; want nil err", err)
	}
	if stdout.String() != usage {
		t.Fatalf("run(--help) wrote %q; want usage text", stdout.String())
	}
}

func TestRunVersion(t *testing.T) {
	var stdout bytes.Buffer
	if err := run([]string{"--version"}, &stdout); err != nil {
		t.Fatalf("run(--version) = %v; want nil err", err)
	}
	if got := stdout.String(); got != versionLine() {
		t.Fatalf("run(--version) = %q; want %q", got, versionLine())
	}
}

func TestRunUsageError(t *testing.T) {
	err := run([]string{"--bogus"}, &bytes.Buffer{})
	assertUsageError(t, err, "Unknown option: --bogus")
}

func TestRunNoInstance(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("XDG_CONFIG_HOME", dir)
	t.Setenv("BETTER_DIFFS_URL", "")
	withDefaultURL(t, "")

	err := run(nil, &bytes.Buffer{})
	assertError(t, err, "No instance configured")
}

func TestRunUpload(t *testing.T) {
	dir := initGitRepo(t)
	commitFile(t, dir, "a.txt", "old\n")
	writeFile(t, dir, "a.txt", "new\n")

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/api/diffs" {
			t.Errorf("request = %s %s; want POST /api/diffs", r.Method, r.URL.Path)
		}
		w.WriteHeader(http.StatusCreated)
		_, _ = io.WriteString(w, testShareURL)
	}))
	t.Cleanup(server.Close)

	chdir(t, dir)

	var stdout bytes.Buffer
	if err := run([]string{"--url", server.URL}, &stdout); err != nil {
		t.Fatalf("run(...) = %v; want nil err", err)
	}
	if got := stdout.String(); got != testShareURL+"\n" {
		t.Fatalf("stdout = %q; want %q", got, testShareURL+"\n")
	}
}

func TestReport(t *testing.T) {
	tests := []struct {
		name string
		err  error
		code int
		want string
	}{
		{
			name: "usage error",
			err:  usagef("Unknown option: --bogus"),
			code: exitUsage,
			want: "better-diffs: Unknown option: --bogus\n\n" + usage,
		},
		{
			name: "other error",
			err:  errors.New("No changes found"),
			code: exitError,
			want: "better-diffs: No changes found\n",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			var stderr bytes.Buffer
			if got := report(&stderr, tc.err); got != tc.code {
				t.Fatalf("report(%v) = %d; want %d", tc.err, got, tc.code)
			}
			if got := stderr.String(); got != tc.want {
				t.Fatalf("stderr = %q; want %q", got, tc.want)
			}
		})
	}
}
