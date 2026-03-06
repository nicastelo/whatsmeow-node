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

Automated checks:

```bash
# Go parity/build checks
go run ./scripts/check-client-parity
go build ./cmd/whatsmeow-node
go vet ./...

# TypeScript checks
cd ts && npm run lint
cd ts && npm run format:check
cd ts && npm run build
cd ts && npm test
```

Manual smoke checks:

```bash
# Pair a device
cd ts && npx tsx examples/pair.ts

# Send a test message (after pairing)
cd ts && npx tsx examples/send-test.ts

# Run broad API smoke test (requires paired session.db)
cd ts && npx tsx examples/smoke-test.ts [phone]
```

## CI

- **Push/PR to main**: Runs `go run ./scripts/check-client-parity`, `go build`, `go vet`, `npm run lint`, `npm run format:check`, `npm run build`, `npm test`
- **Tag `v*`**: Cross-compiles Go for 7 platforms, publishes platform packages + main package to npm, creates GitHub release

## Parity Roadmap

`scripts/client-parity.json` is the source of truth for parity coverage:

- `wrapped`: methods already exposed over IPC
- `excluded`: methods not currently exposed, each with explicit rationale
- `policy.intentional_exclusions`: exclusions that are intentionally out-of-scope for IPC
- `priorities.P1/P2/P3`: planned wrapper batches for parity burn-down

When adding wrappers, move methods from `excluded` -> `wrapped` and keep priorities in sync.

## Releasing

1. Bump version in `ts/package.json`
2. Run `node scripts/sync-versions.mjs` to sync all platform packages
3. Commit: `git add ts/package.json npm/*/package.json && git commit -m "Bump to 0.5.0"`
4. Tag: `git tag v0.5.0`
5. Push both: `git push origin main v0.5.0`
6. CI handles the rest (build, publish, GitHub release, version sync commit)

**Important:** Always commit the synced versions _before_ tagging so that `main` is never behind the published version. The release workflow also commits synced versions back to `main` as a safety net, but the source should already be in sync.

## Version Syncing

The `scripts/sync-versions.mjs` script reads the version from `ts/package.json` and writes it to:
- All `npm/*/package.json` platform packages
- The `optionalDependencies` in `ts/package.json`

Run it after bumping `ts/package.json` and commit the result. The release workflow runs it again as a safety net and commits back to `main` if anything drifted.
