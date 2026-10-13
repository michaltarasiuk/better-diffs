package main

import (
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

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
		_, _ = io.WriteString(w, testShareURL+"\n")
	}))
	t.Cleanup(server.Close)

	got, err := upload(server.URL, Version, []byte(testPatch))
	if err != nil {
		t.Fatalf("upload(...) = %v; want nil err", err)
	}
	if got != testShareURL {
		t.Fatalf("upload(...) = %q; want %q", got, testShareURL)
	}
	if gotMethod != http.MethodPost {
		t.Fatalf("method = %q; want POST", gotMethod)
	}
	if gotPath != "/api/diffs" {
		t.Fatalf("path = %q; want /api/diffs", gotPath)
	}
	if string(gotBody) != testPatch {
		t.Fatalf("body = %q; want %q", gotBody, testPatch)
	}
}

func TestUploadErrors(t *testing.T) {
	tests := []struct {
		name        string
		status      int
		contentType string
		body        string
		wantErr     string
	}{
		{
			name:        "html error page",
			status:      http.StatusRequestEntityTooLarge,
			contentType: "text/html",
			body:        "<html><body>413 Request Entity Too Large</body></html>",
			wantErr:     "Upload failed with status 413 Request Entity Too Large",
		},
		{
			name:    "success body that is not a url",
			status:  http.StatusCreated,
			body:    "ok",
			wantErr: `Invalid share URL "ok": missing http(s) scheme`,
		},
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
				if tc.contentType != "" {
					w.Header().Set("Content-Type", tc.contentType)
				}
				w.WriteHeader(tc.status)
				if tc.body != "" {
					_, _ = io.WriteString(w, tc.body)
				}
			}))
			t.Cleanup(server.Close)

			_, err := upload(server.URL, Version, []byte(testPatch))
			assertError(t, err, tc.wantErr)
		})
	}
}

func TestUploadInvalidBaseURL(t *testing.T) {
	_, err := upload("://bad-url", Version, []byte(testPatch))
	assertErrorContains(t, err, "Invalid instance URL")
}
