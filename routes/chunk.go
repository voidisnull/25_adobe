package routes

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/ShardulNalegave/adobe-hackathon/utils"
	"github.com/go-chi/chi/v5"
	"github.com/jmoiron/sqlx"
)

type ChunkDetail struct {
	ID         int64  `db:"id" json:"id"`
	FileID     int64  `db:"file_id" json:"file_id"`
	PageNumber int    `db:"page_number" json:"page_number"`
	Text       string `db:"text" json:"text"`
	Summary    string `db:"summary" json:"summary"`
}

func mountChunkRoutes(r *chi.Mux) {
	r.Get("/api/chunks/{chunk_id}", getChunkHandler)
}

func getChunkHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	db := ctx.Value(utils.DatabaseKey).(*sqlx.DB)

	idStr := chi.URLParam(r, "chunk_id")
	if idStr == "" {
		http.Error(w, "chunk_id required", http.StatusBadRequest)
		return
	}
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "invalid chunk_id", http.StatusBadRequest)
		return
	}

	const q = `
SELECT id, file_id, page_number, text, COALESCE(summary, '') as summary
FROM chunks
WHERE id = $1
`

	var chunk ChunkDetail
	if err := db.GetContext(ctx, &chunk, q, id); err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "chunk not found", http.StatusNotFound)
			return
		}
		http.Error(w, "db query failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(chunk)
}
