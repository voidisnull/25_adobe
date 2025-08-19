package routes

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/ShardulNalegave/adobe-hackathon/utils"
	"github.com/go-chi/chi/v5"
	"github.com/jmoiron/sqlx"
)

type UploadResponse struct {
	FileID     int64  `json:"file_id"`
	Filename   string `json:"filename"`
	UploadedAt string `json:"uploaded_at"`
}

type UploadError struct {
	Filename string `json:"filename"`
	Error    string `json:"error"`
}

type BatchUploadResponse struct {
	Files  []UploadResponse `json:"files"`
	Errors []UploadError    `json:"errors,omitempty"`
}

func mountUploadRoutes(r *chi.Mux) {
	r.Post("/api/upload", uploadFile)
	r.Post("/api/upload/batch", uploadBatchFiles)
}

func saveUploadedFile(
	db *sqlx.DB,
	uploadDir string,
	src multipart.File,
	filename string,
) (fileID int64, uploadedAt time.Time, err error) {
	err = db.QueryRowx(
		`INSERT INTO files (filename) VALUES ($1) RETURNING id, uploaded_at`,
		filename,
	).Scan(&fileID, &uploadedAt)
	if err != nil {
		return 0, time.Time{}, fmt.Errorf("db insert failed: %w", err)
	}

	dstPath := filepath.Join(uploadDir, fmt.Sprintf("%d.pdf", fileID))
	out, err := os.Create(dstPath)
	if err != nil {
		// best-effort cleanup of DB row
		_, _ = db.Exec("DELETE FROM files WHERE id = $1", fileID)
		return 0, time.Time{}, fmt.Errorf("failed to create file on disk: %w", err)
	}

	_, err = io.Copy(out, src)
	out.Close()
	if err != nil {
		_ = os.Remove(dstPath)
		_, _ = db.Exec("DELETE FROM files WHERE id = $1", fileID)
		return 0, time.Time{}, fmt.Errorf("failed to save file to disk: %w", err)
	}

	return fileID, uploadedAt, nil
}

func notifyIngestService(fileURL string, fileID int64) {
	ingestURL := os.Getenv("INGEST_SERVICE_URL")
	if ingestURL == "" {
		return
	}

	go func(url string) {
		body := map[string]any{"url": url, "file_id": fileID}
		b, _ := json.Marshal(body)

		client := &http.Client{Timeout: 10 * time.Second}
		resp, err := client.Post(ingestURL, "application/json", bytes.NewReader(b))
		if err != nil {
			fmt.Println("notifyIngestService: post error:", err)
			return
		}
		defer resp.Body.Close()
		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			respBody, _ := io.ReadAll(resp.Body)
			fmt.Printf("notifyIngestService: non-2xx from ingest service: %d %s\n", resp.StatusCode, string(respBody))
			return
		}
	}(fileURL)
}

func buildFileURL(r *http.Request, fileID int64) string {
	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	}
	return fmt.Sprintf("%s://%s/api/files/%d/raw", scheme, r.Host, fileID)
}

func uploadFile(w http.ResponseWriter, r *http.Request) {
	db := r.Context().Value(utils.DatabaseKey).(*sqlx.DB)

	uploadDir := os.Getenv("FILES_UPLOAD_DIR")

	if err := os.MkdirAll(uploadDir, 0o755); err != nil {
		http.Error(w, "server config error", http.StatusInternalServerError)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "File Required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	filename := header.Filename
	if filename == "" {
		http.Error(w, "Filename missing", http.StatusBadRequest)
		return
	}

	fileID, uploadedAt, err := saveUploadedFile(db, uploadDir, file, filename)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	fileURL := buildFileURL(r, fileID)
	notifyIngestService(fileURL, fileID)

	resp := UploadResponse{
		FileID:     fileID,
		Filename:   filename,
		UploadedAt: uploadedAt.UTC().Format(time.RFC3339),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	_ = json.NewEncoder(w).Encode(resp)
}

func uploadBatchFiles(w http.ResponseWriter, r *http.Request) {
	db := r.Context().Value(utils.DatabaseKey).(*sqlx.DB)

	uploadDir := os.Getenv("FILES_UPLOAD_DIR")

	if err := os.MkdirAll(uploadDir, 0o755); err != nil {
		http.Error(w, "server config error", http.StatusInternalServerError)
		return
	}

	if err := r.ParseMultipartForm(500 << 20); err != nil {
		http.Error(w, "failed to parse multipart form", http.StatusBadRequest)
		return
	}

	var fileHeaders []*multipart.FileHeader
	if r.MultipartForm != nil && r.MultipartForm.File != nil {
		if fhs, ok := r.MultipartForm.File["files"]; ok && len(fhs) > 0 {
			fileHeaders = append(fileHeaders, fhs...)
		} else {
			for _, arr := range r.MultipartForm.File {
				if len(arr) > 0 {
					fileHeaders = append(fileHeaders, arr...)
				}
			}
		}
	}

	if len(fileHeaders) == 0 {
		http.Error(w, "no files provided", http.StatusBadRequest)
		return
	}

	var resp BatchUploadResponse

	for _, fh := range fileHeaders {
		src, err := fh.Open()
		if err != nil {
			resp.Errors = append(resp.Errors, UploadError{Filename: fh.Filename, Error: "failed to open uploaded file"})
			continue
		}

		func() {
			defer src.Close()

			fileID, uploadedAt, err := saveUploadedFile(db, uploadDir, src, fh.Filename)
			if err != nil {
				resp.Errors = append(resp.Errors, UploadError{Filename: fh.Filename, Error: err.Error()})
				return
			}

			resp.Files = append(resp.Files, UploadResponse{
				FileID:     fileID,
				Filename:   fh.Filename,
				UploadedAt: uploadedAt.UTC().Format(time.RFC3339),
			})

			fileURL := buildFileURL(r, fileID)
			notifyIngestService(fileURL, fileID)
		}()
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	_ = json.NewEncoder(w).Encode(resp)
}
