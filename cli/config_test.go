package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestPickBaseURL(t *testing.T) {
	for _, tc := range []struct {
		flag, env, configured, defaultInstance string
		want                                   string
		ok                                     bool
	}{
		{
			flag: "http://127.0.0.1:8001", env: "http://127.0.0.1:8002",
			configured: "http://127.0.0.1:8003", defaultInstance: "http://127.0.0.1:8004",
			want: "http://127.0.0.1:8001", ok: true,
		},
		{
			env: "http://127.0.0.1:8002", configured: "http://127.0.0.1:8003",
			defaultInstance: "http://127.0.0.1:8004",
			want:            "http://127.0.0.1:8002", ok: true,
		},
		{
			configured: "http://127.0.0.1:8003", defaultInstance: "http://127.0.0.1:8004",
			want: "http://127.0.0.1:8003", ok: true,
		},
		{defaultInstance: "http://127.0.0.1:8004", want: "http://127.0.0.1:8004", ok: true},
		{env: "http://127.0.0.1:8002/", want: "http://127.0.0.1:8002", ok: true},
		{ok: false},
	} {
		got, ok := pickBaseURL(tc.flag, tc.env, tc.configured, tc.defaultInstance)
		if got != tc.want || ok != tc.ok {
			t.Errorf("pickBaseURL(%q, %q, %q, %q) = %q, %v; want %q, %v",
				tc.flag, tc.env, tc.configured, tc.defaultInstance, got, ok, tc.want, tc.ok)
		}
	}
}

func TestReadConfiguredURL(t *testing.T) {
	dir := t.TempDir()

	path := filepath.Join(dir, "config")
	if err := os.WriteFile(path, []byte("# comment\nurl = http://127.0.0.1:8003\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	got, err := readConfiguredURL(path)
	if err != nil {
		t.Errorf("readConfiguredURL(%q) = %v; want nil err", path, err)
		return
	}
	if got != "http://127.0.0.1:8003" {
		t.Errorf("readConfiguredURL(%q) = %q; want http://127.0.0.1:8003", path, got)
	}

	missing := filepath.Join(dir, "absent")
	got, err = readConfiguredURL(missing)
	if err != nil {
		t.Errorf("readConfiguredURL(%q) = %v; want nil err", missing, err)
		return
	}
	if got != "" {
		t.Errorf("readConfiguredURL(%q) = %q; want empty", missing, got)
	}
}
