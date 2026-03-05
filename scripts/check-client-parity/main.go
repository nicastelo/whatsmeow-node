package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"reflect"
	"regexp"
	"sort"

	"go.mau.fi/whatsmeow"
)

type parityConfig struct {
	Wrapped  map[string]string `json:"wrapped"`
	Excluded map[string]string `json:"excluded"`
}

func main() {
	repoRoot, err := os.Getwd()
	must(err)

	cfgPath := filepath.Join(repoRoot, "scripts", "client-parity.json")
	cfgData, err := os.ReadFile(cfgPath)
	must(err)

	var cfg parityConfig
	must(json.Unmarshal(cfgData, &cfg))

	methods := listClientMethods()
	methodSet := make(map[string]struct{}, len(methods))
	for _, m := range methods {
		methodSet[m] = struct{}{}
	}

	commands := listIPCCommands(filepath.Join(repoRoot, "cmd", "whatsmeow-node", "app.go"))
	commandSet := make(map[string]struct{}, len(commands))
	for _, c := range commands {
		commandSet[c] = struct{}{}
	}

	var errs []string

	covered := make(map[string]struct{}, len(cfg.Wrapped)+len(cfg.Excluded))
	for method, cmd := range cfg.Wrapped {
		if _, ok := methodSet[method]; !ok {
			errs = append(errs, fmt.Sprintf("wrapped contains unknown method: %s", method))
		}
		if _, dup := covered[method]; dup {
			errs = append(errs, fmt.Sprintf("method listed more than once: %s", method))
		}
		covered[method] = struct{}{}
		if cmd == "" {
			errs = append(errs, fmt.Sprintf("wrapped method %s has empty command mapping", method))
			continue
		}
		if _, ok := commandSet[cmd]; !ok {
			errs = append(errs, fmt.Sprintf("wrapped method %s maps to unknown IPC command %q", method, cmd))
		}
	}

	for method, reason := range cfg.Excluded {
		if _, ok := methodSet[method]; !ok {
			errs = append(errs, fmt.Sprintf("excluded contains unknown method: %s", method))
		}
		if _, dup := covered[method]; dup {
			errs = append(errs, fmt.Sprintf("method listed in both wrapped/excluded: %s", method))
		}
		covered[method] = struct{}{}
		if reason == "" {
			errs = append(errs, fmt.Sprintf("excluded method %s has empty reason", method))
		}
	}

	for _, method := range methods {
		if _, ok := covered[method]; !ok {
			errs = append(errs, fmt.Sprintf("missing method in parity config: %s", method))
		}
	}

	sort.Strings(errs)
	if len(errs) > 0 {
		fmt.Println("Client parity check failed:")
		for _, e := range errs {
			fmt.Printf("  - %s\n", e)
		}
		os.Exit(1)
	}

	fmt.Printf("Client parity check passed (%d methods, %d wrapped, %d excluded)\n", len(methods), len(cfg.Wrapped), len(cfg.Excluded))
}

func listClientMethods() []string {
	t := reflect.TypeOf((*whatsmeow.Client)(nil))
	methods := make([]string, 0, t.NumMethod())
	for i := 0; i < t.NumMethod(); i++ {
		methods = append(methods, t.Method(i).Name)
	}
	sort.Strings(methods)
	return methods
}

func listIPCCommands(appPath string) []string {
	data, err := os.ReadFile(appPath)
	must(err)
	re := regexp.MustCompile(`case "([^"]+)":`)
	matches := re.FindAllSubmatch(data, -1)
	commands := make([]string, 0, len(matches))
	seen := make(map[string]struct{}, len(matches))
	for _, m := range matches {
		cmd := string(m[1])
		if _, ok := seen[cmd]; ok {
			continue
		}
		seen[cmd] = struct{}{}
		commands = append(commands, cmd)
	}
	sort.Strings(commands)
	return commands
}

func must(err error) {
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}
