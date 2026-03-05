package main

import (
	"context"
	"strings"

	_ "modernc.org/sqlite" // pure-Go SQLite driver, registers as "sqlite"
	_ "github.com/jackc/pgx/v5/stdlib" // pure-Go Postgres driver, registers as "pgx"

	"go.mau.fi/whatsmeow/store/sqlstore"
	waLog "go.mau.fi/whatsmeow/util/log"
)

// openStore creates a sqlstore container from a connection string.
// Supports:
//   - "file:session.db" or anything with "file:" → SQLite (driver: "sqlite")
//   - "postgres://..." → PostgreSQL (driver: "pgx")
func openStore(ctx context.Context, dsn string) (*sqlstore.Container, error) {
	dialect := "pgx"
	if strings.HasPrefix(dsn, "file:") || strings.HasPrefix(dsn, "sqlite") {
		dialect = "sqlite"
		// modernc.org/sqlite uses _pragma=name(value) syntax.
		// - foreign_keys: required by whatsmeow
		// - journal_mode=WAL: allows concurrent reads during writes
		// - busy_timeout=5000: wait up to 5s on lock instead of failing immediately
		if strings.Contains(dsn, "?") {
			dsn += "&"
		} else {
			dsn += "?"
		}
		dsn += "_pragma=foreign_keys(1)&_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)"
	}

	logger := waLog.Noop
	container, err := sqlstore.New(ctx, dialect, dsn, logger)
	if err != nil {
		return nil, err
	}
	return container, nil
}
