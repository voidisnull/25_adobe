package routes

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/ShardulNalegave/adobe-hackathon/utils"
	"github.com/go-chi/chi/v5"
	"github.com/jmoiron/sqlx"
	pgvector "github.com/pgvector/pgvector-go"
)

type PodcastRequest struct {
	SelectionText string `json:"selection_text"`
}

type podcastChunk struct {
	ID         int64  `json:"id" db:"id"`
	FileID     int64  `json:"file_id" db:"file_id"`
	PageNumber int    `json:"page_number" db:"page_number"`
	Summary    string `json:"summary" db:"summary"`
	Text       string `json:"text" db:"text"`
}

type PodcastResponse struct {
	ID         int64          `json:"id"`
	ChunksUsed []podcastChunk `json:"chunks_used"`
}

func mountPodcastRoute(r *chi.Mux) {
	r.Post("/api/podcasts", podcastHandler)
	r.Get("/api/podcasts", listPodcasts)
	r.Get("/api/podcasts/{podcast_id}", getPodcast)
	r.Get("/api/podcasts/{podcast_id}/audio", servePodcastAudio)
	r.Delete("/api/podcasts/{podcast_id}", deletePodcast)
}

func podcastHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	db := ctx.Value(utils.DatabaseKey).(*sqlx.DB)

	// parse request
	var req PodcastRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(req.SelectionText) == "" {
		http.Error(w, "selection_text required", http.StatusBadRequest)
		return
	}

	// 1) get embedding from python embed service (short timeout client)
	embedURL := os.Getenv("EMBED_SERVICE_URL")
	if embedURL == "" {
		embedURL = "http://127.0.0.1:5000/embed"
	}
	embReq := map[string]string{"text": req.SelectionText}
	bb, _ := json.Marshal(embReq)

	// client with a reasonable timeout for quick embed call
	shortClient := &http.Client{Timeout: 15 * time.Second}
	httpReq, _ := http.NewRequestWithContext(ctx, http.MethodPost, embedURL, bytes.NewReader(bb))
	httpReq.Header.Set("Content-Type", "application/json")
	httpResp, err := shortClient.Do(httpReq)
	if err != nil {
		http.Error(w, "embed service call failed: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer httpResp.Body.Close()
	if httpResp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(httpResp.Body)
		http.Error(w, "embed service error: "+string(b), http.StatusInternalServerError)
		return
	}
	var embResp struct {
		Embedding []float64 `json:"embedding"`
	}
	if err := json.NewDecoder(httpResp.Body).Decode(&embResp); err != nil {
		http.Error(w, "invalid embed response", http.StatusInternalServerError)
		return
	}
	if len(embResp.Embedding) == 0 {
		http.Error(w, "empty embedding", http.StatusInternalServerError)
		return
	}

	// convert to []float32 for pgvector-go
	vec := make([]float32, len(embResp.Embedding))
	for i, v := range embResp.Embedding {
		vec[i] = float32(v)
	}
	pgvec := pgvector.NewVector(vec)

	// 2) query top 30 chunks (across all files)
	const q = `
SELECT id, file_id, page_number, COALESCE(summary, '') as summary, text
FROM chunks
WHERE embedding IS NOT NULL
ORDER BY embedding <-> $1
LIMIT 30;
`
	var chunks []podcastChunk
	if err := db.SelectContext(ctx, &chunks, q, pgvec); err != nil {
		if err == sql.ErrNoRows {
			chunks = []podcastChunk{}
		} else {
			http.Error(w, "db query failed: "+err.Error(), http.StatusInternalServerError)
			return
		}
	}

	// 3) create podcasts row (PENDING)
	var podcastID int64
	err = db.QueryRowContext(ctx, "INSERT INTO podcasts (status) VALUES ($1) RETURNING id", "PENDING").Scan(&podcastID)
	if err != nil {
		http.Error(w, "failed to create podcast row: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 4) insert podcasts_chunks rows
	tx, err := db.BeginTxx(ctx, nil)
	if err != nil {
		http.Error(w, "db tx start failed: "+err.Error(), http.StatusInternalServerError)
		return
	}
	for _, c := range chunks {
		if _, err := tx.ExecContext(ctx, "INSERT INTO podcasts_chunks (podcast_id, chunk_id) VALUES ($1, $2)", podcastID, c.ID); err != nil {
			_ = tx.Rollback()
			http.Error(w, "failed to insert podcasts_chunks: "+err.Error(), http.StatusInternalServerError)
			return
		}
	}
	if err := tx.Commit(); err != nil {
		http.Error(w, "failed to commit podcasts_chunks: "+err.Error(), http.StatusInternalServerError)
		return
	}

	podcastServiceURL := os.Getenv("PODCAST_SERVICE_URL")
	if podcastServiceURL == "" {
		podcastServiceURL = "http://127.0.0.1:5000/podcast"
	}

	type simpleChunk struct {
		ID         int64  `json:"id"`
		FileID     int64  `json:"file_id"`
		PageNumber int    `json:"page_number"`
		Summary    string `json:"summary"`
		Text       string `json:"text"`
	}
	schunks := make([]simpleChunk, len(chunks))
	for i := range chunks {
		schunks[i] = simpleChunk{
			ID:         chunks[i].ID,
			FileID:     chunks[i].FileID,
			PageNumber: chunks[i].PageNumber,
			Summary:    chunks[i].Summary,
			Text:       chunks[i].Text,
		}
	}
	payload := map[string]interface{}{
		"podcast_id":     podcastID,
		"selection_text": req.SelectionText,
		"chunks":         schunks,
	}
	payloadBytes, _ := json.Marshal(payload)

	noTimeoutClient := &http.Client{
		Timeout: 0,
	}
	httpReq2, _ := http.NewRequestWithContext(context.Background(), http.MethodPost, podcastServiceURL, bytes.NewReader(payloadBytes))
	httpReq2.Header.Set("Content-Type", "application/json")
	httpResp2, err := noTimeoutClient.Do(httpReq2)
	if err != nil {
		_, _ = db.ExecContext(ctx, "UPDATE podcasts SET status = $1 WHERE id = $2", "FAILED", podcastID)
		http.Error(w, "podcast service call failed: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer httpResp2.Body.Close()
	if httpResp2.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(httpResp2.Body)
		_, _ = db.ExecContext(ctx, "UPDATE podcasts SET status = $1 WHERE id = $2", "FAILED", podcastID)
		http.Error(w, "podcast service error: "+string(b), http.StatusInternalServerError)
		return
	}

	if _, err := db.ExecContext(ctx, "UPDATE podcasts SET status = $1 WHERE id = $2", "DONE", podcastID); err != nil {
		http.Error(w, "failed to update podcast row: "+err.Error(), http.StatusInternalServerError)
		return
	}

	resp := PodcastResponse{
		ID:         podcastID,
		ChunksUsed: chunks,
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

type PodcastSummary struct {
	ID     int64  `db:"id" json:"id"`
	Status string `db:"status" json:"status"`
}

// PodcastChunk is the chunk shape returned in podcast detail
type PodcastChunk struct {
	ID         int64  `db:"id" json:"id"`
	FileID     int64  `db:"file_id" json:"file_id"`
	PageNumber int    `db:"page_number" json:"page_number"`
	Summary    string `db:"summary" json:"summary"`
	Text       string `db:"text" json:"text"`
}

// PodcastDetail returned by GET /podcasts/{podcast_id}
type PodcastDetail struct {
	ID     int64          `json:"id"`
	Status string         `json:"status"`
	Chunks []PodcastChunk `json:"chunks"`
}

func listPodcasts(w http.ResponseWriter, r *http.Request) {
	db := r.Context().Value(utils.DatabaseKey).(*sqlx.DB)

	const q = `SELECT id, status FROM podcasts ORDER BY id DESC`
	var pods []PodcastSummary
	if err := db.SelectContext(r.Context(), &pods, q); err != nil {
		http.Error(w, "db query failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(pods)
}

func getPodcast(w http.ResponseWriter, r *http.Request) {
	db := r.Context().Value(utils.DatabaseKey).(*sqlx.DB)

	idStr := chi.URLParam(r, "podcast_id")
	if idStr == "" {
		http.Error(w, "podcast_id required", http.StatusBadRequest)
		return
	}
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "invalid podcast_id", http.StatusBadRequest)
		return
	}

	const podcastQ = `SELECT id, status FROM podcasts WHERE id = $1`
	var pod PodcastSummary
	if err := db.GetContext(r.Context(), &pod, podcastQ, id); err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "podcast not found", http.StatusNotFound)
			return
		}
		http.Error(w, "db query failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	const chunksQ = `
SELECT c.id, c.file_id, c.page_number, COALESCE(c.summary, '') AS summary, c.text
FROM podcasts_chunks pc
JOIN chunks c ON pc.chunk_id = c.id
WHERE pc.podcast_id = $1
ORDER BY pc.chunk_id
`
	var chunks []PodcastChunk
	if err := db.SelectContext(r.Context(), &chunks, chunksQ, id); err != nil {
		// If no rows, return empty list; otherwise error
		if err == sql.ErrNoRows {
			chunks = []PodcastChunk{}
		} else {
			http.Error(w, "db query failed: "+err.Error(), http.StatusInternalServerError)
			return
		}
	}

	detail := PodcastDetail{
		ID:     pod.ID,
		Status: pod.Status,
		Chunks: chunks,
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(detail)
}

func servePodcastAudio(w http.ResponseWriter, r *http.Request) {
	_ = r.Context() // keep for parity, not needed here
	idStr := chi.URLParam(r, "podcast_id")
	if idStr == "" {
		http.Error(w, "podcast_id required", http.StatusBadRequest)
		return
	}
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "invalid podcast_id", http.StatusBadRequest)
		return
	}

	audioDir := os.Getenv("PODCASTS_AUDIO_DIR")
	if audioDir == "" {
		audioDir = filepath.Join("data", "podcasts")
	}

	wd, _ := os.Getwd()
	absPath := filepath.Join(wd, audioDir, fmt.Sprintf("%d.wav", id))

	f, err := os.Open(absPath)
	if err != nil {
		if os.IsNotExist(err) {
			http.Error(w, "audio file not found", http.StatusNotFound)
			return
		}
		http.Error(w, "failed to open audio file", http.StatusInternalServerError)
		return
	}
	defer f.Close()

	fi, err := f.Stat()
	if err != nil {
		http.Error(w, "failed to stat audio file", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "audio/wav")
	w.Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=%q", fmt.Sprintf("%d.wav", id)))

	http.ServeContent(w, r, fmt.Sprintf("%d.wav", id), fi.ModTime(), f)
}

func deletePodcast(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	db := ctx.Value(utils.DatabaseKey).(*sqlx.DB)

	idStr := chi.URLParam(r, "podcast_id")
	if idStr == "" {
		http.Error(w, "podcast_id required", http.StatusBadRequest)
		return
	}
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "invalid podcast_id", http.StatusBadRequest)
		return
	}

	// delete podcast row (podcasts_chunks will cascade)
	res, err := db.ExecContext(ctx, "DELETE FROM podcasts WHERE id = $1", id)
	if err != nil {
		http.Error(w, "db delete failed: "+err.Error(), http.StatusInternalServerError)
		return
	}
	ra, _ := res.RowsAffected()
	if ra == 0 {
		http.Error(w, "podcast not found", http.StatusNotFound)
		return
	}

	// attempt to delete audio file (ignore missing file)
	audioDir := os.Getenv("PODCASTS_AUDIO_DIR")
	if audioDir == "" {
		audioDir = filepath.Join("data", "podcasts")
	}
	wd, _ := os.Getwd()
	absPath := filepath.Join(wd, audioDir, fmt.Sprintf("%d.wav", id))
	if err := os.Remove(absPath); err != nil && !os.IsNotExist(err) {
		// file removal failed (not because missing) — log and return 500
		http.Error(w, "failed to delete audio file: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
