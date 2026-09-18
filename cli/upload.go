package main

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	uploadTimeout = 30 * time.Second
	responseLimit = 64 * 1024
)

func upload(baseURL, version string, patch []byte) (string, error) {
	endpoint, err := url.JoinPath(baseURL, "api", "diffs")
	if err != nil {
		return "", fmt.Errorf("invalid instance URL %q: %v", baseURL, err)
	}

	client := &http.Client{Timeout: uploadTimeout}
	req, err := http.NewRequest(http.MethodPost, endpoint, bytes.NewReader(patch))
	if err != nil {
		return "", fmt.Errorf("failed to create upload request: %v", err)
	}

	req.Header.Set("Content-Type", "text/x-patch")
	req.Header.Set("Accept", "text/plain")
	req.Header.Set("User-Agent", "better-diffs/"+version)

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to reach %s: %v", baseURL, err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, responseLimit))
	if err != nil {
		return "", fmt.Errorf("failed to read response from %s: %v", baseURL, err)
	}

	message := strings.TrimSpace(string(body))
	if resp.StatusCode != http.StatusCreated {
		if message == "" {
			return "", fmt.Errorf("upload failed with status %s", resp.Status)
		}
		return "", fmt.Errorf("upload failed: %s", message)
	}
	return message, nil
}
