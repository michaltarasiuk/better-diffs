package main

import (
	"fmt"
	"os"
)

const (
	exitError = 1
	exitUsage = 2
)

func die(err error) {
	fmt.Fprintf(os.Stderr, "better-diffs: %v\n", err)
	os.Exit(exitError)
}

func dieUsage(err error) {
	fmt.Fprintf(os.Stderr, "better-diffs: %v\n\n", err)
	fmt.Fprint(os.Stderr, usage)
	os.Exit(exitUsage)
}
