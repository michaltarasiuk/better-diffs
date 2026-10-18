package main

import "strings"

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
	var cmd command
	opts := &cmd.options
	for i := 0; i < len(args); i++ {
		arg := args[i]

		// Paths start at "--", a lone "-", or the first non-flag so a file
		// named like an option still reaches git.
		if arg == "--" {
			opts.paths = append(opts.paths, args[i+1:]...)
			break
		}
		if !isFlag(arg) {
			opts.paths = append(opts.paths, args[i:]...)
			break
		}

		name, value, inline := strings.Cut(arg, "=")
		switch name {
		case "--help", "-h", "--version", "--staged", "--open", "-o":
			if inline {
				return command{}, usagef("Option takes no value: %s", arg)
			}
		case "--base", "--url":
			if !inline && i+1 < len(args) {
				i++
				value = args[i]
			}
			if value == "" {
				return command{}, usagef("Missing value for %s", name)
			}
		default:
			return command{}, usagef("Unknown option: %s", arg)
		}

		switch name {
		case "--help", "-h":
			return command{help: true}, nil
		case "--version":
			return command{version: true}, nil
		case "--staged":
			opts.staged = true
		case "--open", "-o":
			opts.open = true
		case "--base":
			// git diff reads a leading dash as an option, and options like
			// --output write files.
			if strings.HasPrefix(value, "-") {
				return command{}, usagef("Invalid base: %s", value)
			}
			opts.base = value
		case "--url":
			opts.url = value
		}
	}
	return cmd, nil
}

func isFlag(arg string) bool {
	return len(arg) > 1 && arg[0] == '-'
}
