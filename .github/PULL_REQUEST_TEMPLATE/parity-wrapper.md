## Summary

Wrap one or more excluded `whatsmeow.Client` methods and move them to `wrapped` in `scripts/client-parity.json`.

## Methods Wrapped

- [ ] `MethodName` -> `ipcCommandName`

## Parity Contract Updates

- [ ] Moved wrapped methods from `excluded` to `wrapped` in `scripts/client-parity.json`
- [ ] Added/updated explicit rationale for any remaining exclusions touched in this PR

## IPC + Types + Docs

- [ ] Go IPC command handler added/updated
- [ ] TypeScript client method added/updated
- [ ] TypeScript types exported/updated (`ts/src/types.ts` and `ts/src/index.ts` if needed)
- [ ] README/API docs updated
- [ ] INTERNALS docs updated (if command/event surface changed)

## Tests

- [ ] Unit tests added/updated for new TS wrapper(s)
- [ ] `go run ./scripts/check-client-parity` passes
- [ ] `go build ./cmd/whatsmeow-node` passes
- [ ] `go vet ./...` passes
- [ ] `cd ts && npm run lint && npm test` passes

## Notes

- Keep wrappers faithful to upstream method semantics (argument names, defaults, return shape).
- Prefer explicit validation errors (`ERR_INVALID_ARGS`) when input domain is known.
