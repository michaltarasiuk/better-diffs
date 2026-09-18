package main

import (
	"fmt"
	"strings"
)

type command struct {
	help    bool
	version bool
	options options
}

type options struct {
	staged bool
	base   string
	url    string
	open   bool
	paths  []string
}

func parseArgs(args []string) (command, error) {
	opts := options{}
	i := 0
	for i < len(args) {
		arg := args[i]
		i++

		/*
		 * Parsing stops at the first path so that a file named like an
		 * option still reaches git.
		 */
		if !isFlag(arg) {
			opts.paths = append(opts.paths, arg)
			opts.paths = append(opts.paths, args[i:]...)
			break
		}
		if arg == "-" || arg == "--" {
			opts.paths = append(opts.paths, args[i:]...)
			break
		}

		name, value, inline := splitFlag(arg)
		switch name {
		case "staged":
			if err := takesNoValue(inline, value, arg); err != nil {
				return command{}, err
			}
			opts.staged = true
		case "open", "o":
			if err := takesNoValue(inline, value, arg); err != nil {
				return command{}, err
			}
			opts.open = true
		case "base":
			v, err := takeValue(inline, value, args, &i, arg)
			if err != nil {
				return command{}, err
			}
			opts.base = v
		case "url":
			v, err := takeValue(inline, value, args, &i, arg)
			if err != nil {
				return command{}, err
			}
			opts.url = v
		case "help", "h":
			return command{help: true}, nil
		case "version":
			return command{version: true}, nil
		default:
			return command{}, fmt.Errorf("unknown option: %s", arg)
		}
	}

	return command{options: opts}, nil
}

func isFlag(arg string) bool {
	return len(arg) > 0 && arg[0] == '-'
}

func splitFlag(arg string) (name, value string, inline bool) {
	flag := arg
	for len(flag) > 0 && flag[0] == '-' {
		flag = flag[1:]
	}
	if before, after, ok := strings.Cut(flag, "="); ok {
		return before, after, true
	}
	return flag, "", false
}

func takesNoValue(inline bool, value, arg string) error {
	if inline || value != "" {
		return fmt.Errorf("option takes no value: %s", arg)
	}
	return nil
}

func takeValue(inline bool, value string, args []string, i *int, arg string) (string, error) {
	if inline {
		return value, nil
	}
	if value != "" {
		return value, nil
	}
	if *i >= len(args) {
		return "", fmt.Errorf("missing value for %s", arg)
	}
	v := args[*i]
	*i++
	return v, nil
}
