package models

type PodcastStatus string

const (
	PendingPodcastStatus PodcastStatus = "PENDING"
	DonePodcastStatus    PodcastStatus = "DONE"
	FailedPodcastStatus  PodcastStatus = "FAILED"
)

type PodcastModel struct {
	ID       uint64        `db:"id" json:"id"`
	AudioURL string        `db:"audio_url" json:"audio_url"`
	Status   PodcastStatus `db:"status" json:"status"`
}
