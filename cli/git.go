package main

import (
	"bytes"
	"errors"
	"fmt"
	"os/exec"
	"strings"
)

func diff(base string, staged bool, paths []string) ([]byte, error) {
	out, err := exec.Command("git", diffArgs(base, staged, paths)...).Output()
	if err != nil {
		return nil, diffErr(err)
	}
	if len(bytes.TrimSpace(out)) == 0 {
		return nil, errors.New("No changes found")
	}
	return out, nil
}

func diffArgs(base string, staged bool, paths []string) []string {
	args := []string{"diff"}
	if base != "" {
		args = append(args, base)
	}
	if staged {
		args = append(args, "--staged")
	}
	return append(append(args, "--"), paths...)
}

func diffErr(err error) error {
	if errors.Is(err, exec.ErrNotFound) {
		return errors.New("Git is required")
	}
	var exitErr *exec.ExitError
	if errors.As(err, &exitErr) {
		msg := strings.TrimSpace(string(exitErr.Stderr))
		if msg == "" {
			return fmt.Errorf("Git diff exited with %v", exitErr.ProcessState)
		}
		return errors.New(msg)
	}
	return fmt.Errorf("Run git diff: %w", err)
}
