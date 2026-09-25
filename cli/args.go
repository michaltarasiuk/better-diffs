package main

import (
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

func parse(args []string) (command, error) {
	opts := options{}
	i := 0
	for i < len(args) {
		arg := args[i]
		i++

		/*
		 * Paths start at "--", a lone "-", or the first non-flag so a file
		 * named like an option still reaches git.
		 */
		if arg == "--" || arg == "-" {
			opts.paths = append(opts.paths, args[i:]...)
			break
		}
		if !flag(arg) {
			opts.paths = append(opts.paths, arg)
			opts.paths = append(opts.paths, args[i:]...)
			break
		}

		name, value, inline := cutFlag(arg)
		switch name {
		case "staged":
			if err := noValue(inline, value, arg); err != nil {
				return command{}, err
			}
			opts.staged = true
		case "open", "o":
			if err := noValue(inline, value, arg); err != nil {
				return command{}, err
			}
			opts.open = true
		case "base":
			v, err := need(inline, value, args, &i, arg)
			if err != nil {
				return command{}, err
			}
			opts.base = v
		case "url":
			v, err := need(inline, value, args, &i, arg)
			if err != nil {
				return command{}, err
			}
			opts.url = v
		case "help", "h":
			return command{help: true}, nil
		case "version":
			return command{version: true}, nil
		default:
			return command{}, usagef("Unknown option: %s", arg)
		}
	}

	return command{options: opts}, nil
}

func flag(arg string) bool {
	return len(arg) > 1 && arg[0] == '-'
}

func cutFlag(arg string) (name, value string, inline bool) {
	s := arg
	for len(s) > 0 && s[0] == '-' {
		s = s[1:]
	}
	if before, after, ok := strings.Cut(s, "="); ok {
		return before, after, true
	}
	return s, "", false
}

func noValue(inline bool, value, arg string) error {
	if inline || value != "" {
		return usagef("Option takes no value: %s", arg)
	}
	return nil
}

func need(inline bool, value string, args []string, i *int, arg string) (string, error) {
	if inline {
		return value, nil
	}
	if *i >= len(args) {
		return "", usagef("Missing value for %s", arg)
	}
	v := args[*i]
	*i++
	return v, nil
}
