package main

import (
	"bytes"
	"testing"
)

func TestFlag(t *testing.T) {
	tests := []struct {
		arg  string
		want bool
	}{
		{
			arg:  "--staged",
			want: true,
		},
		{
			arg:  "-o",
			want: true,
		},
		{
			arg:  "-",
			want: false,
		},
		{
			arg:  "src/",
			want: false,
		},
		{
			arg:  "",
			want: false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.arg, func(t *testing.T) {
			if got := flag(tc.arg); got != tc.want {
				t.Fatalf("flag(%q) = %v; want %v", tc.arg, got, tc.want)
			}
		})
	}
}

func TestParse(t *testing.T) {
	tests := []struct {
		name string
		args []string
		want command
		err  string
	}{
		{
			name: "help long",
			args: []string{"--help"},
			want: command{help: true},
		},
		{
			name: "help short",
			args: []string{"-h"},
			want: command{help: true},
		},
		{
			name: "version",
			args: []string{"--version"},
			want: command{version: true},
		},
		{
			name: "empty",
			args: nil,
			want: command{options: options{}},
		},
		{
			name: "mixed options and paths",
			args: []string{"--staged", "--base", "main", "-o", "--", "src/", "README.md"},
			want: command{options: options{
				staged: true,
				base:   "main",
				open:   true,
				paths:  []string{"src/", "README.md"},
			}},
		},
		{
			name: "inline values",
			args: []string{"--base=main", "--url=http://127.0.0.1:3000"},
			want: command{options: options{
				base: "main",
				url:  "http://127.0.0.1:3000",
			}},
		},
		{
			name: "path before flag",
			args: []string{"src/", "--staged"},
			want: command{options: options{paths: []string{"src/", "--staged"}}},
		},
		{
			name: "double dash paths",
			args: []string{"--", "-", "src/"},
			want: command{options: options{paths: []string{"-", "src/"}}},
		},
		{
			name: "option with value rejected",
			args: []string{"--staged=1"},
			err:  "Option takes no value: --staged=1",
		},
		{
			name: "open with value rejected",
			args: []string{"--open=1"},
			err:  "Option takes no value: --open=1",
		},
		{
			name: "unknown option",
			args: []string{"--bogus"},
			err:  "Unknown option: --bogus",
		},
		{
			name: "missing base value",
			args: []string{"--base"},
			err:  "Missing value for --base",
		},
		{
			name: "missing url value",
			args: []string{"--url"},
			err:  "Missing value for --url",
		},
		{
			name: "empty inline value",
			args: []string{"--base="},
			err:  "Missing value for --base",
		},
		{
			name: "base that git reads as an option",
			args: []string{"--base=--output=/tmp/patch"},
			err:  "Invalid base: --output=/tmp/patch",
		},
		{
			name: "base followed by a flag",
			args: []string{"--base", "--staged"},
			err:  "Invalid base: --staged",
		},
		{
			name: "long option with one dash",
			args: []string{"-staged"},
			err:  "Unknown option: -staged",
		},
		{
			name: "short option with two dashes",
			args: []string{"--o"},
			err:  "Unknown option: --o",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, err := parse(tc.args)
			if tc.err != "" {
				assertUsageError(t, err, tc.err)
				return
			}
			if err != nil {
				t.Fatalf("parse(%v) = %v; want nil err", tc.args, err)
			}
			assertCommandEqual(t, got, tc.want)
		})
	}
}

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
