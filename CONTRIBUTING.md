# Contributing to whatsmeow-node

## Prerequisites

- Go 1.25+
- Node.js 18+

## Setup

```bash
# Build the Go binary
cd cmd/whatsmeow-node
go build -o ../../whatsmeow-node .

# Install TS dependencies and build
cd ../../ts
npm install
npm run build
```

## Development

```bash
# Watch mode for TypeScript
cd ts && npm run dev

# Rebuild Go binary after changes
cd cmd/whatsmeow-node && go build -o ../../whatsmeow-node .
```

### Lint and format

```bash
cd ts
npm run lint        # ESLint
npm run format:check  # Prettier check
npm run format      # Prettier fix
```

## Repository Structure

```
whatsmeow-node/
  go.mod
  cmd/
    whatsmeow-node/
      main.go         -- stdin/stdout JSON-line loop, command dispatch
      app.go          -- App struct, command router
      commands.go     -- command handlers (~30 commands)
      events.go       -- whatsmeow event -> JSON serialization
      store.go        -- SQLite/Postgres store setup
  ts/
    package.json
    tsconfig.json
    eslint.config.js
    src/
      index.ts        -- public exports + createClient()
      client.ts       -- WhatsmeowClient class (typed EventEmitter + methods)
      process.ts      -- Go binary lifecycle + IPC
      types.ts        -- all TypeScript interfaces
      errors.ts       -- error classes
    examples/
      pair.ts         -- QR pairing example
      send-test.ts    -- message sending example
  npm/
    darwin-arm64/     -- platform package stubs (binaries added at release)
    darwin-x64/
    linux-x64/
    linux-x64-musl/
    linux-arm64/
    win32-x64/
    win32-arm64/
  scripts/
    sync-versions.mjs -- sync version across all packages
  .github/workflows/
    ci.yml            -- lint + build on push/PR
    release.yml       -- cross-compile + publish on tag
```

## Adding a New Command

1. **Go side** -- Add a handler in `cmd/whatsmeow-node/commands.go`:

```go
case "myNewCommand":
    args := parseArgs[struct {
        Jid string `json:"jid"`
    }](rawArgs)
    // call whatsmeow
    result, err := a.client.SomeMethod(a.ctx, ...)
    if err != nil {
        return nil, err
    }
    return map[string]any{"key": result}, nil
```

2. **TypeScript side** -- Add a method in `ts/src/client.ts`:

```typescript
async myNewCommand(jid: JID): Promise<SomeType> {
    return (await this.proc.send("myNewCommand", { jid })) as SomeType;
}
```

3. **Types** -- Add any new interfaces to `ts/src/types.ts`.

4. **Export** -- If the new type should be public, add it to `ts/src/index.ts`.

## Adding a New Event

1. **Go side** -- Add a case in `cmd/whatsmeow-node/events.go`:

```go
case *events.MyEvent:
    a.sendEvent("my_event", map[string]any{
        "field": v.Field,
    })
```

2. **TypeScript side** -- Add the event type to `WhatsmeowEvents` in `ts/src/types.ts`:

```typescript
my_event: { field: string };
```

3. **Forward it** -- Add the forwarding line in the `WhatsmeowClient` constructor in `ts/src/client.ts`:

```typescript
this.proc.on("my_event", (d) => this.emit("my_event", d));
```

## Testing

No test runner is configured yet. To test manually:

```bash
# Pair a device
cd ts && npx tsx examples/pair.ts

# Send a test message (after pairing)
cd ts && npx tsx examples/send-test.ts
```

## CI

- **Push/PR to main**: Runs `go build`, `go vet`, `npm run lint`, `npm run format:check`, `npm run build`
- **Tag `v*`**: Cross-compiles Go for 7 platforms, publishes platform packages + main package to npm, creates GitHub release

## Releasing

1. Bump version in `ts/package.json`
2. Run `node scripts/sync-versions.mjs` to sync all platform packages
3. Commit and tag: `git tag v0.2.0`
4. Push tag: `git push origin v0.2.0`
5. CI handles the rest (build, publish, GitHub release)

## Version Syncing

The `scripts/sync-versions.mjs` script reads the version from `ts/package.json` and writes it to:
- All `npm/*/package.json` platform packages
- The `optionalDependencies` in `ts/package.json`

The release workflow also does this automatically from the git tag.
