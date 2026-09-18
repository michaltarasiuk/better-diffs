package main

import (
	"errors"
	"fmt"
	"os/exec"
	"runtime"
)

func openBrowser(url string) error {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", url)
	case "windows":
		/*
		 * `start` is a cmd.exe builtin rather than an executable, and it
		 * takes its first quoted argument as the window title.
		 */
		cmd = exec.Command("cmd", "/c", "start", "", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}

	if err := cmd.Start(); err != nil {
		if errors.Is(err, exec.ErrNotFound) {
			return fmt.Errorf("cannot open browser: %s not found", cmd.Path)
		}
		return fmt.Errorf("cannot open browser: %v", err)
	}
	return nil
}
