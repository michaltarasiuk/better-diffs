package main

import (
	"bytes"
	"testing"
)

func TestIsFlag(t *testing.T) {
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
			want: true,
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
			if got := isFlag(tc.arg); got != tc.want {
				t.Fatalf("isFlag(%q) = %v; want %v", tc.arg, got, tc.want)
			}
		})
	}
}

func TestSplitFlag(t *testing.T) {
	tests := []struct {
		arg        string
		wantName   string
		wantValue  string
		wantInline bool
	}{
		{
			arg:        "--base=main",
			wantName:   "base",
			wantValue:  "main",
			wantInline: true,
		},
		{
			arg:        "--base",
			wantName:   "base",
			wantInline: false,
		},
		{
			arg:        "-o",
			wantName:   "o",
			wantInline: false,
		},
		{
			arg:        "--url=http://127.0.0.1:3000",
			wantName:   "url",
			wantValue:  "http://127.0.0.1:3000",
			wantInline: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.arg, func(t *testing.T) {
			name, value, inline := splitFlag(tc.arg)
			if name != tc.wantName || value != tc.wantValue || inline != tc.wantInline {
				t.Fatalf("splitFlag(%q) = (%q, %q, %v); want (%q, %q, %v)",
					tc.arg, name, value, inline, tc.wantName, tc.wantValue, tc.wantInline)
			}
		})
	}
}

func TestParseArgs(t *testing.T) {
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
			err:  "option takes no value: --staged=1",
		},
		{
			name: "open with value rejected",
			args: []string{"--open=1"},
			err:  "option takes no value: --open=1",
		},
		{
			name: "unknown option",
			args: []string{"--bogus"},
			err:  "unknown option: --bogus",
		},
		{
			name: "missing base value",
			args: []string{"--base"},
			err:  "missing value for --base",
		},
		{
			name: "missing url value",
			args: []string{"--url"},
			err:  "missing value for --url",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, err := parseArgs(tc.args)
			if tc.err != "" {
				assertUsageError(t, err, tc.err)
				return
			}
			if err != nil {
				t.Fatalf("parseArgs(%v) = %v; want nil err", tc.args, err)
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
	assertUsageError(t, err, "unknown option: --bogus")
}

func TestRunNoInstance(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("XDG_CONFIG_HOME", dir)
	t.Setenv("BETTER_DIFFS_URL", "")
	withDefaultURL(t, "")

	err := run(nil, &bytes.Buffer{})
	assertErrorContains(t, err, "no instance configured")
}
