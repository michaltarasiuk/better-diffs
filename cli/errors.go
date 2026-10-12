package main

import "fmt"

// usageError reports invalid command-line input.
type usageError string

func (e usageError) Error() string {
	return string(e)
}

func usagef(format string, args ...any) error {
	return usageError(fmt.Sprintf(format, args...))
}
