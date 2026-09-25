package main

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

const samplePatch = "diff --git a/a b/a\n"

func TestUploadSuccess(t *testing.T) {
	var (
		gotMethod string
		gotPath   string
		gotBody   []byte
	)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotMethod = r.Method
		gotPath = r.URL.Path
		if got := r.Header.Get("Content-Type"); got != "text/x-patch" {
			t.Errorf("Content-Type = %q; want text/x-patch", got)
		}
		if got := r.Header.Get("Accept"); got != "text/plain" {
			t.Errorf("Accept = %q; want text/plain", got)
		}
		if got := r.Header.Get("User-Agent"); got != "better-diffs/"+Version {
			t.Errorf("User-Agent = %q; want better-diffs/%s", got, Version)
		}
		var err error
		gotBody, err = io.ReadAll(r.Body)
		if err != nil {
			t.Errorf("read body: %v", err)
		}
		w.WriteHeader(http.StatusCreated)
		_, _ = io.WriteString(w, "http://127.0.0.1/d/abc\n")
	}))
	t.Cleanup(server.Close)

	got, err := upload(server.URL, Version, []byte(samplePatch))
	if err != nil {
		t.Fatalf("upload(...) = %v; want nil err", err)
	}
	if got != "http://127.0.0.1/d/abc" {
		t.Fatalf("upload(...) = %q; want http://127.0.0.1/d/abc", got)
	}
	if gotMethod != http.MethodPost {
		t.Fatalf("method = %q; want POST", gotMethod)
	}
	if gotPath != "/api/diffs" {
		t.Fatalf("path = %q; want /api/diffs", gotPath)
	}
	if string(gotBody) != samplePatch {
		t.Fatalf("body = %q; want %q", gotBody, samplePatch)
	}
}

func TestUploadErrors(t *testing.T) {
	tests := []struct {
		name    string
		status  int
		body    string
		wantErr string
	}{
		{
			name:    "bad request body",
			status:  http.StatusBadRequest,
			body:    "No diffs found in patch\n",
			wantErr: "Upload failed: No diffs found in patch",
		},
		{
			name:    "empty error body",
			status:  http.StatusInternalServerError,
			wantErr: "Upload failed with status 500 Internal Server Error",
		},
		{
			name:    "empty success body",
			status:  http.StatusCreated,
			wantErr: "Empty share URL",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(tc.status)
				if tc.body != "" {
					_, _ = io.WriteString(w, tc.body)
				}
			}))
			t.Cleanup(server.Close)

			_, err := upload(server.URL, Version, []byte(samplePatch))
			assertError(t, err, tc.wantErr)
		})
	}
}

func TestUploadInvalidBaseURL(t *testing.T) {
	_, err := upload("://bad-url", Version, []byte(samplePatch))
	if err == nil {
		t.Fatal("upload(invalid URL) = nil err; want err")
	}
	if !strings.Contains(err.Error(), "Invalid instance URL") {
		t.Fatalf("upload(invalid URL) = %q; want Invalid instance URL", err.Error())
	}
}
