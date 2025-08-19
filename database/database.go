package database

import (
	"os"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"github.com/rs/zerolog/log"
)

const db_init_schema = `
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS files (
  id         BIGSERIAL PRIMARY KEY,
  filename   TEXT NOT NULL,
  uploaded_at TIMESTamptz DEFAULT now(),
  num_pages  INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS chunks (
  id          BIGSERIAL PRIMARY KEY,
  file_id     BIGINT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  embedding   VECTOR(768),
  text_tsv    TSVECTOR,
  summary     TEXT
);

CREATE INDEX IF NOT EXISTS idx_chunks_file_id ON chunks (file_id);

CREATE INDEX IF NOT EXISTS idx_chunks_embedding
  ON chunks USING ivfflat (embedding) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_chunks_text_tsv
  ON chunks USING gin (text_tsv);

CREATE TABLE IF NOT EXISTS podcasts (
  id     BIGSERIAL PRIMARY KEY,
  status VARCHAR(15) NOT NULL,
  CONSTRAINT podcasts_status_check CHECK (status::text = ANY (ARRAY['PENDING'::text, 'DONE'::text, 'FAILED'::text]))
);

CREATE TABLE IF NOT EXISTS podcasts_chunks (
  podcast_id BIGINT NOT NULL REFERENCES podcasts(id) ON DELETE CASCADE,
  chunk_id   BIGINT NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
  PRIMARY KEY (podcast_id, chunk_id)
);
`

func ConnectToDatabase() *sqlx.DB {
	dsn := os.Getenv("POSTGRES_DSN")
	if dsn == "" {
		log.Fatal().Msg("postgres.dsn not provided")
		return nil
	}

	db, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		log.Fatal().Err(err).Msg("Could not connect to provided PostgreSQL DSN")
	}

	db.MustExec(db_init_schema)
	log.Info().Msg("[Database] Connected to PostgreSQL")
	return db
}
