package main

import (
	"reflect"
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
			want: false,
		},
		{
			arg:  "a/",
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
			args: []string{"--staged", "--base", "main", "-o", "--", "a/", "b.txt"},
			want: command{options: options{
				staged: true,
				base:   "main",
				open:   true,
				paths:  []string{"a/", "b.txt"},
			}},
		},
		{
			name: "inline values",
			args: []string{"--base=main", "--url=" + testInstanceURL},
			want: command{options: options{
				base: "main",
				url:  testInstanceURL,
			}},
		},
		{
			name: "path before flag",
			args: []string{"a/", "--staged"},
			want: command{options: options{paths: []string{"a/", "--staged"}}},
		},
		{
			name: "double dash paths",
			args: []string{"--", "-", "a/"},
			want: command{options: options{paths: []string{"-", "a/"}}},
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
			name: "help with value rejected",
			args: []string{"--help=1"},
			err:  "Option takes no value: --help=1",
		},
		{
			name: "version with value rejected",
			args: []string{"--version=1"},
			err:  "Option takes no value: --version=1",
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
			if !reflect.DeepEqual(got, tc.want) {
				t.Fatalf("parse(%v) = %+v; want %+v", tc.args, got, tc.want)
			}
		})
	}
}
