package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestPick(t *testing.T) {
	tests := []struct {
		name            string
		flag            string
		env             string
		configured      string
		defaultInstance string
		want            string
		ok              bool
	}{
		{
			name:            "flag wins",
			flag:            "http://127.0.0.1:8001",
			env:             "http://127.0.0.1:8002",
			configured:      "http://127.0.0.1:8003",
			defaultInstance: "http://127.0.0.1:8004",
			want:            "http://127.0.0.1:8001",
			ok:              true,
		},
		{
			name:            "env wins over config",
			env:             "http://127.0.0.1:8002",
			configured:      "http://127.0.0.1:8003",
			defaultInstance: "http://127.0.0.1:8004",
			want:            "http://127.0.0.1:8002",
			ok:              true,
		},
		{
			name:            "config wins over default",
			configured:      "http://127.0.0.1:8003",
			defaultInstance: "http://127.0.0.1:8004",
			want:            "http://127.0.0.1:8003",
			ok:              true,
		},
		{
			name:            "default only",
			defaultInstance: "http://127.0.0.1:8004",
			want:            "http://127.0.0.1:8004",
			ok:              true,
		},
		{
			name: "trailing slash trimmed",
			env:  "http://127.0.0.1:8002/",
			want: "http://127.0.0.1:8002",
			ok:   true,
		},
		{
			name: "whitespace ignored",
			env:  "  http://127.0.0.1:8002  ",
			want: "http://127.0.0.1:8002",
			ok:   true,
		},
		{
			name: "none configured",
			ok:   false,
		},
		{
			name: "whitespace only",
			env:  "   ",
			ok:   false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, ok := pick(tc.flag, tc.env, tc.configured, tc.defaultInstance)
			if got != tc.want || ok != tc.ok {
				t.Fatalf("pick(...) = %q, %v; want %q, %v", got, ok, tc.want, tc.ok)
			}
		})
	}
}

func TestCheckURL(t *testing.T) {
	tests := []struct {
		name        string
		raw         string
		wantErr     string
		wantErrLike string
	}{
		{
			name: "http",
			raw:  "http://127.0.0.1:3000",
		},
		{
			name: "https with path",
			raw:  "https://example.com/api",
		},
		{
			name:        "missing scheme",
			raw:         "127.0.0.1:3000",
			wantErrLike: `Invalid instance URL "127.0.0.1:3000":`,
		},
		{
			name:    "unsupported scheme",
			raw:     "ftp://example.com",
			wantErr: `Invalid instance URL "ftp://example.com": missing http(s) scheme`,
		},
		{
			name:    "missing host",
			raw:     "http://",
			wantErr: `Invalid instance URL "http://": missing host`,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := checkURL(tc.raw)
			if tc.wantErr == "" && tc.wantErrLike == "" {
				if err != nil {
					t.Fatalf("checkURL(%q) = %v; want nil err", tc.raw, err)
				}
				return
			}
			if tc.wantErr != "" {
				assertError(t, err, tc.wantErr)
				return
			}
			assertErrorContains(t, err, tc.wantErrLike)
		})
	}
}

func TestInstance(t *testing.T) {
	tests := []struct {
		name        string
		flag        string
		env         string
		config      string
		defaultURL  string
		want        string
		wantErr     string
		wantErrLike string
	}{
		{
			name: "flag",
			flag: "http://127.0.0.1:3000",
			want: "http://127.0.0.1:3000",
		},
		{
			name: "env",
			env:  "http://127.0.0.1:4000",
			want: "http://127.0.0.1:4000",
		},
		{
			name:   "config file",
			config: "url=http://127.0.0.1:5000\n",
			want:   "http://127.0.0.1:5000",
		},
		{
			name:       "default url",
			defaultURL: "http://127.0.0.1:6000",
			want:       "http://127.0.0.1:6000",
		},
		{
			name:    "missing",
			wantErr: "No instance configured",
		},
		{
			name:        "invalid flag",
			flag:        "not-a-url",
			wantErrLike: `Invalid instance URL "not-a-url":`,
		},
		{
			name:    "invalid env",
			env:     "ftp://example.com",
			wantErr: `Invalid instance URL "ftp://example.com": missing http(s) scheme`,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			dir := t.TempDir()
			t.Setenv("XDG_CONFIG_HOME", dir)
			t.Setenv("BETTER_DIFFS_URL", tc.env)
			withDefaultURL(t, tc.defaultURL)
			if tc.config != "" {
				writeConfig(t, dir, tc.config)
			}

			got, err := instance(tc.flag)
			if tc.wantErr != "" {
				assertError(t, err, tc.wantErr)
				return
			}
			if tc.wantErrLike != "" {
				assertErrorContains(t, err, tc.wantErrLike)
				return
			}
			if err != nil {
				t.Fatalf("instance(%q) = %v; want nil err", tc.flag, err)
			}
			if got != tc.want {
				t.Fatalf("instance(%q) = %q; want %q", tc.flag, got, tc.want)
			}
		})
	}
}

func TestReadConfig(t *testing.T) {
	dir := t.TempDir()

	tests := []struct {
		name     string
		contents string
		write    bool
		want     string
		wantErr  bool
	}{
		{
			name:     "finds url with comment and blank lines",
			contents: "# comment\n\nurl = http://127.0.0.1:8003\n",
			write:    true,
			want:     "http://127.0.0.1:8003",
		},
		{
			name:     "first url wins",
			contents: "url=http://127.0.0.1:8001\nurl=http://127.0.0.1:8002\n",
			write:    true,
			want:     "http://127.0.0.1:8001",
		},
		{
			name:     "ignores other keys",
			contents: "theme=dark\nurl=http://127.0.0.1:8003\n",
			write:    true,
			want:     "http://127.0.0.1:8003",
		},
		{
			name: "missing file",
			want: "",
		},
		{
			name:     "no url key",
			contents: "theme=dark\n",
			write:    true,
			want:     "",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			path := filepath.Join(dir, tc.name)
			if tc.write {
				if err := os.WriteFile(path, []byte(tc.contents), 0o644); err != nil {
					t.Fatal(err)
				}
			}

			got, err := readConfig(path)
			if tc.wantErr {
				if err == nil {
					t.Fatal("readConfig() = nil err; want err")
				}
				return
			}
			if err != nil {
				t.Fatalf("readConfig(%q) = %v; want nil err", path, err)
			}
			if got != tc.want {
				t.Fatalf("readConfig(%q) = %q; want %q", path, got, tc.want)
			}
		})
	}
}
