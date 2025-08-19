package models

import "github.com/pgvector/pgvector-go"

type ChunkModel struct {
	ID         uint64          `db:"id" json:"id"`
	FileID     uint64          `db:"file_id" json:"file_id"`
	PageNumber uint            `db:"page_number" json:"page_number"`
	Text       string          `db:"text" json:"text"`
	Summary    string          `db:"summary" json:"summary"`
	Embedding  pgvector.Vector `db:"embedding" json:"-"`
}
