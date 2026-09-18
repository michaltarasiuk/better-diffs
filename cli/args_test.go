package main

import (
	"bytes"
	"reflect"
	"strings"
	"testing"
)

func TestParseArgs(t *testing.T) {
	for _, tc := range []struct {
		args []string
		want command
		err  string
	}{
		{args: []string{"--help"}, want: command{help: true}},
		{args: []string{"-h"}, want: command{help: true}},
		{args: []string{"--version"}, want: command{version: true}},
		{
			args: []string{"--staged", "--base", "main", "-o", "--", "src/", "README.md"},
			want: command{options: options{
				staged: true,
				base:   "main",
				open:   true,
				paths:  []string{"src/", "README.md"},
			}},
		},
		{
			args: []string{"--base=main", "--url=http://127.0.0.1:3000"},
			want: command{options: options{
				base: "main",
				url:  "http://127.0.0.1:3000",
			}},
		},
		{
			args: []string{"src/", "--staged"},
			want: command{options: options{paths: []string{"src/", "--staged"}}},
		},
		{args: []string{"--bogus"}, err: "unknown option: --bogus"},
		{args: []string{"--base"}, err: "missing value for --base"},
	} {
		got, err := parseArgs(tc.args)
		if tc.err != "" {
			if err == nil || err.Error() != tc.err {
				t.Errorf("parseArgs(%v) err = %v; want %v", tc.args, err, tc.err)
			}
			continue
		}
		if err != nil {
			t.Errorf("parseArgs(%v) = %v; want nil err", tc.args, err)
			continue
		}
		if !reflect.DeepEqual(got, tc.want) {
			t.Errorf("parseArgs(%v) = %+v; want %+v", tc.args, got, tc.want)
		}
	}
}

func TestRunHelp(t *testing.T) {
	var stdout bytes.Buffer
	if err := run([]string{"--help"}, &stdout); err != nil {
		t.Errorf("run(--help) = %v; want nil err", err)
		return
	}
	if stdout.String() != usage {
		t.Errorf("run(--help) wrote %q; want usage text", stdout.String())
	}
}

func TestRunVersion(t *testing.T) {
	var stdout bytes.Buffer
	if err := run([]string{"--version"}, &stdout); err != nil {
		t.Errorf("run(--version) = %v; want nil err", err)
		return
	}
	if got := strings.TrimSpace(stdout.String()); got != Version {
		t.Errorf("run(--version) = %q; want %q", got, Version)
	}
}
