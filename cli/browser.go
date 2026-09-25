package main

import (
	"errors"
	"os"
	"os/exec"
	"runtime"
	"time"
)

/*
 * browsers returns commands to try when opening a URL, in order.
 * The logic matches cmd/internal/browser in the Go toolchain.
 */
func browsers() [][]string {
	var cmds [][]string
	if exe := os.Getenv("BROWSER"); exe != "" {
		cmds = append(cmds, []string{exe})
	}
	switch runtime.GOOS {
	case "darwin":
		cmds = append(cmds, []string{"/usr/bin/open"})
	case "windows":
		cmds = append(cmds, []string{"cmd", "/c", "start"})
	default:
		if os.Getenv("DISPLAY") != "" {
			cmds = append(cmds, []string{"xdg-open"})
		}
	}
	cmds = append(cmds,
		[]string{"chrome"},
		[]string{"google-chrome"},
		[]string{"chromium"},
		[]string{"firefox"},
	)
	return cmds
}

func browse(url string) error {
	for _, args := range browsers() {
		cmd := exec.Command(args[0], append(args[1:], url)...)
		if err := cmd.Start(); err != nil {
			continue
		}
		if started(cmd, 3*time.Second) {
			return nil
		}
	}
	return errors.New("Cannot open browser")
}

/*
 * started reports whether the browser command likely worked. If the command
 * runs longer than timeout, it is treated as success.
 */
func started(cmd *exec.Cmd, timeout time.Duration) bool {
	errc := make(chan error, 1)
	go func() {
		errc <- cmd.Wait()
	}()

	select {
	case <-time.After(timeout):
		return true
	case err := <-errc:
		return err == nil
	}
}
