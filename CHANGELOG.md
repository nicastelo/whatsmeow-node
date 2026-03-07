# Changelog

All notable changes to this project will be documented in this file.

> **Alpha** — During alpha (0.x), breaking changes may occur on minor version bumps. Pin your version if stability matters.

## [0.5.0] - 2026-03-07

### Added

- 20 new method wrappers — API coverage now **100/126** (up from 80), P1/P2/P3 backlogs cleared:
  - Connection: `resetConnection`
  - Message helpers: `generateMessageID`, `buildMessageKey`, `buildUnavailableMessageRequest`, `buildHistorySyncRequest`
  - Peer & retry: `sendPeerMessage`, `sendMediaRetryReceipt`
  - Download: `downloadMediaWithPath`
  - Bots: `getBotListV2`, `getBotProfiles`
  - App state: `fetchAppState`, `markNotDirty`
  - Crypto: `decryptComment`, `decryptPollVote`, `decryptReaction`, `decryptSecretEncryptedMessage`, `encryptComment`, `encryptPollVote`, `encryptReaction`
  - Parsing: `parseWebMessage`
- New types: `BotListInfo`, `BotProfileInfo`, `AppStatePatchName`, `NewsletterUploadResponse`
- Integration test suite: 88 tests across 14 files (bots, crypto, media, messages, groups, newsletters, etc.)
- 119 unit tests (up from 98)
- `UploadResponse` aligned with proto field naming (`URL`, `fileSHA256`, `fileEncSHA256`)
- Examples type-checked in CI via `check:examples`

### Changed

- `uploadNewsletter()` now returns `NewsletterUploadResponse` (encryption fields are `string | null`) instead of `UploadResponse` — newsletter uploads may not include E2E encryption metadata
- Integration test `commandTimeout` reduced from 30s to 15s to prevent timeout races with vitest
- 26 methods moved to intentional exclusions with documented rationale (context variants, file variants, FB/push APIs)

## [0.4.0] - 2026-03-05

### Added

- Bump whatsmeow to `0.0.0-20260305` (upstream patch, no API changes)
- E2E test suite running nightly against a real WhatsApp session
- E2E workflow cancels gracefully on session expiry instead of failing
- `run-e2e` label trigger to run E2E on PRs
- CI-enforced whatsmeow client parity checker
- Release watch workflow enriched with upstream release notes and commit summary
- New wrappers: `WaitForConnection`, `SetGroupTopic`, `GetStatusPrivacy`, `TryFetchPrivacySettings`
- Tighter `PrivacySettings` value unions
- Parity policy, priorities, and wrapper PR template
- npm and CI badges in README

## [0.3.0] - 2026-03-05

### Breaking Changes

- **`sendMessage` no longer accepts arbitrary message objects** — `MessageContent` was narrowed from `TextMessage | ExtendedTextMessage | Record<string, unknown>` to just `TextMessage | ExtendedTextMessage`. Use `sendRawMessage` for arbitrary `waE2E.Message`-shaped JSON (image, sticker, location, etc.).
- **Strict protojson parsing** — `DiscardUnknown` removed from `buildProtoMessage`. Messages with invalid or misspelled proto fields now return `ERR_INVALID_ARGS` instead of being silently accepted.

### Added

- 38 new methods: polls, communities, newsletters, privacy, blocklist, QR/link resolution, media upload, configuration
- `sendRawMessage` escape hatch via protojson (supports any `waE2E.Message` field)
- `BusinessProfile` now includes `profileOptions`, `businessHoursTimeZone`, `businessHours`
- `BusinessMessageLinkTarget` now includes `isSigned`, `verifiedLevel`
- 84 vitest tests with full mock-based coverage
- Smoke test example (`ts/examples/smoke-test.ts`)

### Changed

- Media uploads stream via `UploadReader` instead of buffering entire file in memory
- `setGroupMemberAddMode` validates input against allowed values
- Newsletter reaction counts sorted for deterministic output
- INTERNALS.md rewritten to match actual IPC commands and events

## [0.2.3] - 2026-03-05

### Added

- README and LICENSE included in all published packages

## [0.2.2] - 2026-03-05

### Fixed

- Trusted Publishing: use Node 24 for OIDC auth

## [0.2.1] - 2026-03-05

### Fixed

- Trusted Publishing configuration fixes

## [0.2.0] - 2026-03-05

### Changed

- Mirror whatsmeow API 1:1
- Dual CJS/ESM build

## [0.1.0] - 2026-03-05

First public release. TypeScript/Node.js bindings for whatsmeow via subprocess IPC.

- ~30 commands: messaging, groups, presence, newsletters, calls, media
- Typed EventEmitter with all whatsmeow events forwarded
- SQLite and PostgreSQL session storage
- Precompiled Go binaries for 7 platforms
- Generic `call()` fallback for any whatsmeow method not yet wrapped

[0.5.0]: https://github.com/nicastelo/whatsmeow-node/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/nicastelo/whatsmeow-node/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/nicastelo/whatsmeow-node/compare/v0.2.3...v0.3.0
[0.2.3]: https://github.com/nicastelo/whatsmeow-node/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/nicastelo/whatsmeow-node/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/nicastelo/whatsmeow-node/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/nicastelo/whatsmeow-node/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/nicastelo/whatsmeow-node/releases/tag/v0.1.0
