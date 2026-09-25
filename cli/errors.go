package main

import "fmt"

/*
 * usageError reports invalid command-line input. main prints usage and exits 2,
 * matching the convention used by the flag package and cmd/go.
 */
type usageError string

func (e usageError) Error() string {
	return string(e)
}

func usagef(format string, args ...any) error {
	return usageError(fmt.Sprintf(format, args...))
}
