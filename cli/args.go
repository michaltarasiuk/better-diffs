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
			opts.paths = append(opts.paths, args[i-1:]...)
			break
		}

		name, value, inline := strings.Cut(arg, "=")
		switch name {
		case "--staged":
			if inline {
				return command{}, usagef("Option takes no value: %s", arg)
			}
			opts.staged = true
		case "--open", "-o":
			if inline {
				return command{}, usagef("Option takes no value: %s", arg)
			}
			opts.open = true
		case "--base":
			v, err := need(name, value, inline, args, &i)
			if err != nil {
				return command{}, err
			}
			/*
			 * git diff reads a leading dash as an option, and options like
			 * --output write files.
			 */
			if strings.HasPrefix(v, "-") {
				return command{}, usagef("Invalid base: %s", v)
			}
			opts.base = v
		case "--url":
			v, err := need(name, value, inline, args, &i)
			if err != nil {
				return command{}, err
			}
			opts.url = v
		case "--help", "-h":
			return command{help: true}, nil
		case "--version":
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

func need(name, value string, inline bool, args []string, i *int) (string, error) {
	if !inline {
		if *i >= len(args) {
			return "", usagef("Missing value for %s", name)
		}
		value = args[*i]
		*i++
	}
	if value == "" {
		return "", usagef("Missing value for %s", name)
	}
	return value, nil
}
