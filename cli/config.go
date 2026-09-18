package main

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

func resolveBaseURL(flagURL string) (string, error) {
	configured := ""
	if path, ok := configPath(); ok {
		var err error
		configured, err = readConfiguredURL(path)
		if err != nil {
			return "", err
		}
	}

	url, ok := pickBaseURL(flagURL, os.Getenv("BETTER_DIFFS_URL"), configured, DefaultURL)
	if !ok {
		return "", fmt.Errorf("no instance configured; pass --url, set BETTER_DIFFS_URL, or write url= to config")
	}
	return url, nil
}

func pickBaseURL(flagURL, envURL, configured, defaultInstance string) (string, bool) {
	for _, url := range []string{flagURL, envURL, configured, defaultInstance} {
		url = strings.TrimSpace(url)
		if url == "" {
			continue
		}
		return strings.TrimRight(url, "/"), true
	}
	return "", false
}

/*
 * Resolved by hand rather than through a platform config directory, which on
 * macOS would be ~/Library/Application Support. The installer writes the
 * config from POSIX shell, so both sides have to agree on the XDG location.
 */
func configPath() (string, bool) {
	if dir := os.Getenv("XDG_CONFIG_HOME"); dir != "" {
		return filepath.Join(dir, "better-diffs", "config"), true
	}
	if runtime.GOOS == "windows" {
		if dir := os.Getenv("APPDATA"); dir != "" {
			return filepath.Join(dir, "better-diffs", "config"), true
		}
		return "", false
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", false
	}
	return filepath.Join(home, ".config", "better-diffs", "config"), true
}

func readConfiguredURL(path string) (string, error) {
	contents, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return "", nil
		}
		return "", fmt.Errorf("failed to read %s: %v", path, err)
	}

	for _, line := range strings.Split(string(contents), "\n") {
		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		if strings.TrimSpace(key) == "url" {
			return strings.TrimSpace(value), nil
		}
	}
	return "", nil
}
