package main

import (
	"runtime"
	"testing"
)

func TestBrowserCommands(t *testing.T) {
	tests := []struct {
		name    string
		browser string
		display string
		want    []string
	}{
		{
			name:    "browser env wins",
			browser: "/usr/bin/my-browser",
			want:    []string{"/usr/bin/my-browser"},
		},
		{
			name: "darwin default",
			want: []string{"/usr/bin/open"},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if tc.name == "darwin default" && runtime.GOOS != "darwin" {
				t.Skip("darwin only")
			}
			t.Setenv("BROWSER", tc.browser)
			if tc.display != "" {
				t.Setenv("DISPLAY", tc.display)
			} else {
				t.Setenv("DISPLAY", "")
			}

			cmds := browserCommands()
			if len(cmds) == 0 {
				t.Fatal("browserCommands() = empty; want commands")
			}
			if got := cmds[0]; len(got) != len(tc.want) || got[0] != tc.want[0] {
				t.Fatalf("browserCommands()[0] = %v; want %v", got, tc.want)
			}
		})
	}
}

func TestOpenBrowserMissing(t *testing.T) {
	if runtime.GOOS == "darwin" {
		t.Skip("/usr/bin/open is available even when PATH is empty")
	}
	t.Setenv("PATH", "")
	t.Setenv("BROWSER", "")
	t.Setenv("DISPLAY", "")
	err := openBrowser("http://127.0.0.1/d/abc")
	assertError(t, err, "cannot open browser")
}
