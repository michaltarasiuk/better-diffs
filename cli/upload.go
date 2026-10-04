package main

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const responseLimit = 64 * 1024

var uploadClient = &http.Client{Timeout: 30 * time.Second}

func upload(baseURL, version string, patch []byte) (string, error) {
	endpoint, err := url.JoinPath(baseURL, "api", "diffs")
	if err != nil {
		return "", fmt.Errorf("Invalid instance URL %q: %w", baseURL, err)
	}

	req, err := http.NewRequest(http.MethodPost, endpoint, bytes.NewReader(patch))
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
		/*
		 * Proxies and size limits answer with HTML pages, which are noise on
		 * a terminal. Only the API's own plain-text errors are worth showing.
		 */
		if msg == "" || !plainText(resp.Header.Get("Content-Type")) {
			return "", fmt.Errorf("Upload failed with status %s", resp.Status)
		}
		return "", fmt.Errorf("Upload failed: %s", msg)
	}

	if msg == "" {
		return "", errors.New("Empty share URL")
	}
	if u, err := url.Parse(msg); err != nil || (u.Scheme != "http" && u.Scheme != "https") {
		return "", fmt.Errorf("Invalid share URL: %q", msg)
	}
	return msg, nil
}

func plainText(contentType string) bool {
	mediaType, _, err := mime.ParseMediaType(contentType)
	return err == nil && mediaType == "text/plain"
}
