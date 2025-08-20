package models

import "time"

type FileStatus string

type FileModel struct {
	ID         uint64    `db:"id" json:"id"`
	Filename   string    `db:"filename" json:"filename"`
	UploadedAt time.Time `db:"uploaded_at" json:"uploaded_at"`
	NumPages   uint      `db:"num_pages" json:"num_pages"`
}
