package main

import (
	"bytes"
	"context"
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

var uploadClient = &http.Client{}

func upload(baseURL, version string, patch []byte) (string, error) {
	endpoint, err := url.JoinPath(baseURL, "api", "diffs")
	if err != nil {
		return "", fmt.Errorf("Invalid instance URL %q: %w", baseURL, err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), uploadTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(patch))
	if err != nil {
		return "", fmt.Errorf("Create upload request: %w", err)
	}
	req.Header.Set("Content-Type", "text/x-patch")
	req.Header.Set("Accept", "text/plain")
	req.Header.Set("User-Agent", "better-diffs/"+version)

	resp, err := uploadClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("Reach %s: %w", baseURL, err)
	}
	defer resp.Body.Close()

	return shareURL(baseURL, resp)
}

func shareURL(baseURL string, resp *http.Response) (string, error) {
	body, err := io.ReadAll(io.LimitReader(resp.Body, responseLimit))
	if err != nil {
		return "", fmt.Errorf("Read response from %s: %w", baseURL, err)
	}

	msg := strings.TrimSpace(string(body))
	if resp.StatusCode != http.StatusCreated {
		if msg == "" {
			return "", fmt.Errorf("Upload failed with status %s", resp.Status)
		}
		return "", fmt.Errorf("Upload failed: %s", msg)
	}
	if msg == "" {
		return "", fmt.Errorf("Empty share URL")
	}
	return msg, nil
}
