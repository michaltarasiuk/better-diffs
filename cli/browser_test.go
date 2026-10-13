package main

import (
	"reflect"
	"runtime"
	"testing"
)

func TestBrowsersPrefersBrowserEnv(t *testing.T) {
	t.Setenv("BROWSER", "/usr/bin/my-browser")
	if got, want := browsers()[0], []string{"/usr/bin/my-browser"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("browsers()[0] = %v; want %v", got, want)
	}
}

func TestBrowsersDefault(t *testing.T) {
	t.Setenv("BROWSER", "")
	t.Setenv("DISPLAY", ":0")

	want := map[string][]string{
		"darwin":  {"/usr/bin/open"},
		"windows": {"rundll32", "url.dll,FileProtocolHandler"},
		"linux":   {"xdg-open"},
	}[runtime.GOOS]
	if want == nil {
		t.Skipf("no default browser command on %s", runtime.GOOS)
	}
	if got := browsers()[0]; !reflect.DeepEqual(got, want) {
		t.Fatalf("browsers()[0] = %v; want %v", got, want)
	}
}

func TestBrowseMissing(t *testing.T) {
	if runtime.GOOS == "darwin" {
		t.Skip("/usr/bin/open is available even when PATH is empty")
	}
	t.Setenv("PATH", "")
	t.Setenv("BROWSER", "")
	t.Setenv("DISPLAY", "")
	err := browse(testShareURL)
	assertError(t, err, "Cannot open browser")
}
