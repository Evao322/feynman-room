CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE auth_sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE explanation_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  concept TEXT,
  lang TEXT,
  grade TEXT,
  transcript_json TEXT,
  material TEXT,
  checker_report TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE stuck_points (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id TEXT,
  concept TEXT,
  trigger_question TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_auth_sessions_user ON auth_sessions(user_id);
CREATE INDEX idx_explanation_sessions_user ON explanation_sessions(user_id);
CREATE INDEX idx_stuck_points_user ON stuck_points(user_id);
