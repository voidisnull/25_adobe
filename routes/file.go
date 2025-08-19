package routes

import (
	"database/sql"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/ShardulNalegave/adobe-hackathon/models"
	"github.com/ShardulNalegave/adobe-hackathon/utils"
	"github.com/go-chi/chi/v5"
	"github.com/jmoiron/sqlx"
)

func mountFileRoutes(r *chi.Mux) {
	r.Get("/api/files", listFiles)
	r.Get("/api/files/{file_id}", getFileMeta)
	r.Get("/api/files/{file_id}/raw", serveFileRaw)
	r.Delete("/api/files/{file_id}", deleteFileHandler)
}

func listFiles(w http.ResponseWriter, r *http.Request) {
	db := r.Context().Value(utils.DatabaseKey).(*sqlx.DB)

	const q = `SELECT id, filename, uploaded_at, num_pages FROM files ORDER BY uploaded_at DESC`
	var files []models.FileModel
	if err := db.SelectContext(r.Context(), &files, q); err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "db query failed")
		return
	}

	utils.WriteJSON(w, http.StatusOK, files)
}

func getFileMeta(w http.ResponseWriter, r *http.Request) {
	db := r.Context().Value(utils.DatabaseKey).(*sqlx.DB)
	idStr := chi.URLParam(r, "file_id")
	if idStr == "" {
		utils.WriteError(w, http.StatusBadRequest, "file_id required")
		return
	}
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		utils.WriteError(w, http.StatusBadRequest, "invalid file_id")
		return
	}

	const q = `SELECT id, filename, uploaded_at, num_pages FROM files WHERE id = $1`
	var fm models.FileModel
	if err := db.GetContext(r.Context(), &fm, q, id); err != nil {
		if err == sql.ErrNoRows {
			utils.WriteError(w, http.StatusNotFound, "file not found")
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "db query failed")
		return
	}

	utils.WriteJSON(w, http.StatusOK, fm)
}

func serveFileRaw(w http.ResponseWriter, r *http.Request) {
	db := r.Context().Value(utils.DatabaseKey).(*sqlx.DB)
	uploadDir := os.Getenv("FILES_UPLOAD_DIR")

	idStr := chi.URLParam(r, "file_id")
	if idStr == "" {
		utils.WriteError(w, http.StatusBadRequest, "file_id required")
		return
	}
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		utils.WriteError(w, http.StatusBadRequest, "invalid file_id")
		return
	}

	const q = `SELECT filename FROM files WHERE id = $1`
	var filename string
	if err := db.QueryRowxContext(r.Context(), q, id).Scan(&filename); err != nil {
		if err == sql.ErrNoRows {
			utils.WriteError(w, http.StatusNotFound, "file not found")
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "db query failed")
		return
	}

	wd, _ := os.Getwd()
	absPath := filepath.Join(wd, uploadDir, fmt.Sprintf("%d.pdf", id))

	f, err := os.Open(absPath)
	if err != nil {
		if os.IsNotExist(err) {
			utils.WriteError(w, http.StatusNotFound, "file not found on disk")
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "failed to open file")
		return
	}
	defer f.Close()

	fi, err := f.Stat()
	if err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "failed to stat file")
		return
	}

	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=%q", filename))

	http.ServeContent(w, r, filename, fi.ModTime(), f)
}

func deleteFileHandler(w http.ResponseWriter, r *http.Request) {
	db := r.Context().Value(utils.DatabaseKey).(*sqlx.DB)
	uploadDir := os.Getenv("FILES_UPLOAD_DIR")

	idStr := chi.URLParam(r, "file_id")
	if idStr == "" {
		utils.WriteError(w, http.StatusBadRequest, "file_id required")
		return
	}
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		utils.WriteError(w, http.StatusBadRequest, "invalid file_id")
		return
	}

	const qCheck = `SELECT id FROM files WHERE id = $1`
	var existingID int64
	if err := db.GetContext(r.Context(), &existingID, qCheck, id); err != nil {
		// not found
		if err == sql.ErrNoRows {
			utils.WriteError(w, http.StatusNotFound, "file not found")
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "db query failed")
		return
	}

	wd, _ := os.Getwd()
	absPath := filepath.Join(wd, uploadDir, fmt.Sprintf("%d.pdf", id))

	if err := os.Remove(absPath); err != nil {
		if !os.IsNotExist(err) {
			utils.WriteError(w, http.StatusInternalServerError, "failed to remove file from disk")
			return
		}
	}

	const qDel = `DELETE FROM files WHERE id = $1`
	res, err := db.ExecContext(r.Context(), qDel, id)
	if err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "db delete failed")
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		utils.WriteError(w, http.StatusNotFound, "file not found")
		return
	}

	utils.WriteJSON(w, http.StatusOK, map[string]bool{"deleted": true})
}
