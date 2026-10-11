CREATE TABLE race_rooms (
  code TEXT PRIMARY KEY,
  host_id TEXT NOT NULL,
  passage_index INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'lobby',
  starts_at INTEGER,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE race_players (
  id TEXT PRIMARY KEY,
  room_code TEXT NOT NULL REFERENCES race_rooms(code) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  seat INTEGER NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  attempts INTEGER NOT NULL DEFAULT 0,
  successful INTEGER NOT NULL DEFAULT 0,
  progress REAL NOT NULL DEFAULT 0,
  finished_at INTEGER,
  last_seen INTEGER NOT NULL,
  sequence INTEGER NOT NULL DEFAULT 0,
  UNIQUE(room_code, seat)
);
--> statement-breakpoint
CREATE INDEX race_players_by_room ON race_players(room_code);
--> statement-breakpoint
CREATE INDEX race_rooms_by_expiry ON race_rooms(expires_at);
