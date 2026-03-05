package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"sync"
)

// ── Protocol types ──────────────────────────────────────────

type Command struct {
	ID   string          `json:"id"`
	Cmd  string          `json:"cmd"`
	Args json.RawMessage `json:"args"`
}

type Response struct {
	ID    string      `json:"id"`
	OK    bool        `json:"ok"`
	Data  interface{} `json:"data,omitempty"`
	Error string      `json:"error,omitempty"`
	Code  string      `json:"code,omitempty"`
}

type Event struct {
	EventName string      `json:"event"`
	Data      interface{} `json:"data,omitempty"`
}

// ── Output writer (thread-safe) ─────────────────────────────

var (
	outMu   sync.Mutex
	outEnc  = json.NewEncoder(os.Stdout)
	errEnc  = json.NewEncoder(os.Stderr)
)

func sendResponse(id string, data interface{}) {
	outMu.Lock()
	defer outMu.Unlock()
	outEnc.Encode(Response{ID: id, OK: true, Data: data})
}

func sendError(id string, err string, code string) {
	outMu.Lock()
	defer outMu.Unlock()
	outEnc.Encode(Response{ID: id, OK: false, Error: err, Code: code})
}

func sendEvent(name string, data interface{}) {
	outMu.Lock()
	defer outMu.Unlock()
	outEnc.Encode(Event{EventName: name, Data: data})
}

func logInfo(msg string, fields ...interface{}) {
	m := map[string]interface{}{"level": "info", "msg": msg}
	for i := 0; i+1 < len(fields); i += 2 {
		m[fmt.Sprint(fields[i])] = fields[i+1]
	}
	errEnc.Encode(m)
}

func logError(msg string, err error) {
	errEnc.Encode(map[string]interface{}{
		"level": "error",
		"msg":   msg,
		"error": err.Error(),
	})
}

// ── Main loop ───────────────────────────────────────────────

func main() {
	app := newApp()

	scanner := bufio.NewScanner(os.Stdin)
	// Increase buffer for large commands (e.g. media paths)
	scanner.Buffer(make([]byte, 1024*1024), 1024*1024)

	logInfo("whatsmeow-node started", "pid", os.Getpid())

	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}

		var cmd Command
		if err := json.Unmarshal(line, &cmd); err != nil {
			logError("invalid command JSON", err)
			continue
		}

		// Dispatch command in a goroutine so we don't block stdin reading
		go app.handleCommand(cmd)
	}

	// stdin closed — parent process died
	logInfo("stdin closed, shutting down")
	app.shutdown()
}
