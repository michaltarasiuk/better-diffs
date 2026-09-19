package main

import (
	"bufio"
	"fmt"
	"net/url"
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

	raw, ok := pickBaseURL(flagURL, os.Getenv("BETTER_DIFFS_URL"), configured, DefaultURL)
	if !ok {
		return "", fmt.Errorf("no instance configured; pass --url, set BETTER_DIFFS_URL, or write url= to config")
	}
	if err := validateBaseURL(raw); err != nil {
		return "", err
	}
	return raw, nil
}

func validateBaseURL(raw string) error {
	u, err := url.Parse(raw)
	if err != nil {
		return fmt.Errorf("invalid instance URL %q: %w", raw, err)
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return fmt.Errorf("invalid instance URL %q: missing http(s) scheme", raw)
	}
	if u.Host == "" {
		return fmt.Errorf("invalid instance URL %q: missing host", raw)
	}
	return nil
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

// configPath returns the config file location. It is resolved by hand rather
// than through a platform config directory, which on macOS would be
// ~/Library/Application Support. The installer writes the config from POSIX
// shell, so both sides have to agree on the XDG location.
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
	f, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return "", nil
		}
		return "", fmt.Errorf("read %s: %w", path, err)
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || line[0] == '#' {
			continue
		}
		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		if strings.TrimSpace(key) == "url" {
			return strings.TrimSpace(value), nil
		}
	}
	if err := scanner.Err(); err != nil {
		return "", fmt.Errorf("read %s: %w", path, err)
	}
	return "", nil
}
