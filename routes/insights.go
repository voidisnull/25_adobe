package routes

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/ShardulNalegave/adobe-hackathon/utils"
	"github.com/go-chi/chi/v5"
	"github.com/jmoiron/sqlx"
	pgvector "github.com/pgvector/pgvector-go"
)

type InsightsRequest struct {
	FileID       int64  `json:"file_id"`
	PageNumber   int    `json:"page_number"`
	SelectedText string `json:"selected_text"`
}

type ChunkResult struct {
	ID         int64  `db:"id" json:"id"`
	FileID     int64  `db:"file_id" json:"file_id"`
	PageNumber int    `db:"page_number" json:"page_number"`
	Summary    string `db:"summary" json:"summary"`
	Text       string `db:"text" json:"text"`
}

type InsightsResponse struct {
	Summary string        `json:"summary"`
	Results []ChunkResult `json:"results"`
}

func mountInsightsRoute(r *chi.Mux) {
	r.Post("/api/insights", insightsHandler)
}

func insightsHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	db := ctx.Value(utils.DatabaseKey).(*sqlx.DB)

	// parse request body
	var req InsightsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}
	if req.FileID == 0 {
		http.Error(w, "file_id is required", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(req.SelectedText) == "" {
		http.Error(w, "selected_text is required", http.StatusBadRequest)
		return
	}

	// call embed service to get embedding vector
	embedURL := os.Getenv("EMBED_SERVICE_URL")
	if embedURL == "" {
		embedURL = "http://127.0.0.1:5000/embed"
	}

	embedReqBody := map[string]string{"text": req.SelectedText}
	bodyBytes, _ := json.Marshal(embedReqBody)

	// shortClient: used only for the quick embed call (fast timeout)
	shortClient := &http.Client{Timeout: 15 * time.Second}
	httpReq, _ := http.NewRequestWithContext(ctx, http.MethodPost, embedURL, bytes.NewReader(bodyBytes))
	httpReq.Header.Set("Content-Type", "application/json")

	httpResp, err := shortClient.Do(httpReq)
	if err != nil {
		http.Error(w, "failed to call embed service: "+err.Error(), http.StatusInternalServerError)
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
		http.Error(w, "invalid embed service response", http.StatusInternalServerError)
		return
	}
	if len(embResp.Embedding) == 0 {
		http.Error(w, "empty embedding from embed service", http.StatusInternalServerError)
		return
	}

	// convert []float64 -> []float32 for pgvector-go
	vec := make([]float32, len(embResp.Embedding))
	for i, v := range embResp.Embedding {
		vec[i] = float32(v)
	}
	pgvec := pgvector.NewVector(vec)

	const q = `
SELECT id, file_id, page_number, COALESCE(summary, '') as summary, text
FROM chunks
WHERE embedding IS NOT NULL AND file_id = $2
ORDER BY embedding <-> $1
LIMIT 30;
`

	var rows []ChunkResult
	if err := db.SelectContext(ctx, &rows, q, pgvec, req.FileID); err != nil {
		if err == sql.ErrNoRows {
			rows = []ChunkResult{}
		} else {
			http.Error(w, "db query failed: "+err.Error(), http.StatusInternalServerError)
			return
		}
	}

	// Prepare payload for downstream insights service
	insightsServiceURL := os.Getenv("INSIGHTS_SERVICE_URL")
	if insightsServiceURL == "" {
		insightsServiceURL = "http://127.0.0.1:5000/insights"
	}

	payload := map[string]any{
		"file_id":       req.FileID,
		"page_number":   req.PageNumber,
		"selected_text": req.SelectedText,
		"chunks":        rows,
	}
	payloadBytes2, _ := json.Marshal(payload)

	noTimeoutClient := &http.Client{
		Timeout: 0,
	}
	insReq, _ := http.NewRequestWithContext(context.Background(), http.MethodPost, insightsServiceURL, bytes.NewReader(payloadBytes2))
	insReq.Header.Set("Content-Type", "application/json")

	insResp, err := noTimeoutClient.Do(insReq)
	if err != nil {
		http.Error(w, "failed to call insights service: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer insResp.Body.Close()

	insBody, _ := io.ReadAll(insResp.Body)
	if insResp.StatusCode != http.StatusOK {
		http.Error(w, "insights service error: "+string(insBody), http.StatusInternalServerError)
		return
	}

	var finalResp InsightsResponse
	if err := json.Unmarshal(insBody, &finalResp); err != nil {
		http.Error(w, "invalid response from insights service", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(finalResp)
}
