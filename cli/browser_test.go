package main

import (
	"runtime"
	"testing"
)

func TestBrowsers(t *testing.T) {
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

			cmds := browsers()
			if len(cmds) == 0 {
				t.Fatal("browsers() = empty; want commands")
			}
			if got := cmds[0]; len(got) != len(tc.want) || got[0] != tc.want[0] {
				t.Fatalf("browsers()[0] = %v; want %v", got, tc.want)
			}
		})
	}
}

func TestBrowseMissing(t *testing.T) {
	if runtime.GOOS == "darwin" {
		t.Skip("/usr/bin/open is available even when PATH is empty")
	}
	t.Setenv("PATH", "")
	t.Setenv("BROWSER", "")
	t.Setenv("DISPLAY", "")
	err := browse("http://127.0.0.1/d/abc")
	assertError(t, err, "Cannot open browser")
}
