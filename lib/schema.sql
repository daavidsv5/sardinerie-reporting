-- Shoptet Reporting — databázové schéma
-- Spusť přes: node --env-file=.env.local scripts/migrate.js

CREATE TABLE IF NOT EXISTS users (
  id            TEXT        PRIMARY KEY,
  email         TEXT        NOT NULL UNIQUE,
  name          TEXT        NOT NULL,
  password_hash TEXT        NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users (LOWER(email));
