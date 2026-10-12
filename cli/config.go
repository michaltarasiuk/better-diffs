package main

import (
	"bufio"
	"errors"
	"fmt"
	"io/fs"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

func instance(flagURL string) (string, error) {
	raw, ok := pick(flagURL, os.Getenv("BETTER_DIFFS_URL"))
	if !ok {
		fromFile, err := fromConfig()
		if err != nil {
			return "", err
		}
		raw, ok = pick(fromFile, DefaultURL)
	}
	if !ok {
		return "", errors.New("No instance configured")
	}
	if err := checkHTTPURL(raw); err != nil {
		return "", fmt.Errorf("Invalid instance URL %q: %w", raw, err)
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

func pick(candidates ...string) (string, bool) {
	for _, s := range candidates {
		s = strings.TrimSpace(s)
		if s == "" {
			continue
		}
		return strings.TrimRight(s, "/"), true
	}
	return "", false
}

// checkHTTPURL reports why raw is not an absolute http(s) URL. Both the
// instance and the share URL the server returns must be one.
func checkHTTPURL(raw string) error {
	u, err := url.Parse(raw)
	if err != nil {
		return err
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return errors.New("missing http(s) scheme")
	}
	if u.Host == "" {
		return errors.New("missing host")
	}
	return nil
}

// configPath is resolved by hand rather than through a platform config
// directory, which on macOS would be ~/Library/Application Support. The
// installer writes the config from POSIX shell, so both sides agree on the
// XDG location.
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
		if errors.Is(err, fs.ErrNotExist) {
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
