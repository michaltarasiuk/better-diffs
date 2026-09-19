package main

import (
	"bytes"
	"errors"
	"fmt"
	"os/exec"
	"strings"
)

func gitDiff(base string, staged bool, paths []string) ([]byte, error) {
	args := []string{"diff"}
	if base != "" {
		args = append(args, base)
	}
	if staged {
		args = append(args, "--staged")
	}
	args = append(args, "--")
	args = append(args, paths...)

	cmd := exec.Command("git", args...)
	output, err := cmd.Output()
	if err != nil {
		if errors.Is(err, exec.ErrNotFound) {
			return nil, errors.New("git is required")
		}
		var exitErr *exec.ExitError
		if errors.As(err, &exitErr) {
			message := strings.TrimSpace(string(exitErr.Stderr))
			if message == "" {
				return nil, fmt.Errorf("git diff exited with %v", exitErr.ProcessState)
			}
			return nil, errors.New(message)
		}
		return nil, fmt.Errorf("run git diff: %w", err)
	}

	if len(bytes.TrimSpace(output)) == 0 {
		return nil, errors.New("no changes found")
	}
	return output, nil
}
