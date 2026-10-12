package main

import (
	"errors"
	"fmt"
	"io"
)

const (
	exitError = 1
	exitUsage = 2
)

// report writes err to w and returns the process exit code. A usageError is
// followed by the usage text and exits 2, matching the flag package and
// cmd/go.
func report(w io.Writer, err error) int {
	var u usageError
	if errors.As(err, &u) {
		fmt.Fprintf(w, "better-diffs: %v\n\n%s", err, usage)
		return exitUsage
	}
	fmt.Fprintf(w, "better-diffs: %v\n", err)
	return exitError
}
