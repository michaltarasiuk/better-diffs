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

func instance(flagURL string) (string, error) {
	fromFile, err := fromConfig()
	if err != nil {
		return "", err
	}

	raw, ok := pick(flagURL, os.Getenv("BETTER_DIFFS_URL"), fromFile, DefaultURL)
	if !ok {
		return "", fmt.Errorf("No instance configured")
	}
	if err := checkURL(raw); err != nil {
		return "", err
	}
	return raw, nil
}

func fromConfig() (string, error) {
	path, ok := configPath()
	if !ok {
		return "", nil
	}
	return readConfig(path)
}

func pick(flagURL, envURL, configured, defaultInstance string) (string, bool) {
	for _, s := range []string{flagURL, envURL, configured, defaultInstance} {
		s = strings.TrimSpace(s)
		if s == "" {
			continue
		}
		return strings.TrimRight(s, "/"), true
	}
	return "", false
}

func checkURL(raw string) error {
	u, err := url.Parse(raw)
	if err != nil {
		return fmt.Errorf("Invalid instance URL %q: %w", raw, err)
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return fmt.Errorf("Invalid instance URL %q: missing http(s) scheme", raw)
	}
	if u.Host == "" {
		return fmt.Errorf("Invalid instance URL %q: missing host", raw)
	}
	return nil
}

/*
 * configPath is resolved by hand rather than through a platform config
 * directory, which on macOS would be ~/Library/Application Support. The
 * installer writes the config from POSIX shell, so both sides agree on the
 * XDG location.
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

func readConfig(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return "", nil
		}
		return "", fmt.Errorf("Read %s: %w", path, err)
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
		return "", fmt.Errorf("Read %s: %w", path, err)
	}
	return "", nil
}
