package main

import (
	"bytes"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRunUpload(t *testing.T) {
	requireGit(t)

	dir := initGitRepo(t)
	writeFile(t, dir, "file.txt", "before\n")
	runGit(t, dir, "add", "file.txt")
	runGit(t, dir, "commit", "-m", "init")
	writeFile(t, dir, "file.txt", "after\n")

	const shareURL = "http://127.0.0.1/d/share-id"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/api/diffs" {
			t.Errorf("request = %s %s; want POST /api/diffs", r.Method, r.URL.Path)
		}
		w.WriteHeader(http.StatusCreated)
		_, _ = io.WriteString(w, shareURL)
	}))
	t.Cleanup(server.Close)

	chdir(t, dir)

	var stdout bytes.Buffer
	if err := run([]string{"--url", server.URL}, &stdout); err != nil {
		t.Fatalf("run(...) = %v; want nil err", err)
	}
	if got := stdout.String(); got != shareURL+"\n" {
		t.Fatalf("stdout = %q; want %q", got, shareURL+"\n")
	}
}
