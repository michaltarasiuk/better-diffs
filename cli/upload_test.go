package main

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestUpload(t *testing.T) {
	for _, tc := range []struct {
		status int
		body   string
		want   string
		err    string
	}{
		{status: http.StatusCreated, body: "http://127.0.0.1/d/abc\n", want: "http://127.0.0.1/d/abc"},
		{status: http.StatusBadRequest, body: "No diffs found in patch\n", err: "upload failed: No diffs found in patch"},
		{status: http.StatusInternalServerError, err: "upload failed with status "},
	} {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if tc.status == http.StatusCreated {
				if got := r.Header.Get("Content-Type"); got != "text/x-patch" {
					t.Errorf("Content-Type = %q; want text/x-patch", got)
				}
				if got := r.Header.Get("Accept"); got != "text/plain" {
					t.Errorf("Accept = %q; want text/plain", got)
				}
				if got := r.Header.Get("User-Agent"); got != "better-diffs/"+Version {
					t.Errorf("User-Agent = %q; want better-diffs/%s", got, Version)
				}
				body, err := io.ReadAll(r.Body)
				if err != nil {
					t.Errorf("read body: %v", err)
				} else if string(body) != "diff --git a/a b/a\n" {
					t.Errorf("body = %q; want diff --git a/a b/a\\n", body)
				}
			}
			w.WriteHeader(tc.status)
			if tc.body != "" {
				_, _ = io.WriteString(w, tc.body)
			}
		}))
		t.Cleanup(server.Close)

		got, err := upload(server.URL, Version, []byte("diff --git a/a b/a\n"))
		if tc.err != "" {
			if err == nil || !strings.Contains(err.Error(), tc.err) {
				t.Errorf("upload(...) err = %v; want substring %q", err, tc.err)
			}
			continue
		}
		if err != nil {
			t.Errorf("upload(...) = %v; want nil err", err)
			continue
		}
		if got != tc.want {
			t.Errorf("upload(...) = %q; want %q", got, tc.want)
		}
	}
}
