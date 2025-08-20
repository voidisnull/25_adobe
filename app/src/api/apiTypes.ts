// Shared API types used by client and dummy data

// File upload response types
export interface FileUploadResponse {
  file_id: number;
  filename: string;
  uploaded_at: string;
  num_pages?: number; // Optional since backend response doesn't include it
}

export interface BatchUploadResponse {
  files: FileUploadResponse[];
}

// File information types
export interface FileInfo {
  id: number;
  filename: string;
  uploaded_at: string;
  num_pages?: number; // Optional since backend response doesn't include it
}

// Insights types
export interface InsightRequest {
  file_id: number;
  page_number: number;
  selected_text: string;
}

export interface InsightResult {
  id: number;
  file_id: number;
  page_number: number;
  summary: string;
  text: string;
}

// New immediate response shape for insights
export interface InsightResponse {
  summary?: string;
  results?: InsightResult[];
}

// Kept for compatibility with existing imports; same shape as InsightResponse now
export interface InsightDetailResponse {
  summary?: string;
  results?: InsightResult[];
}

// Chunk types
export interface ChunkResponse {
  id: number;
  file_id: number;
  page_number: number;
  text: string;
  summary: string;
}

// Podcast types (immediate response; no polling)
export interface PodcastRequest {
  selection_text: string;
  voice?: string;
}

export interface PodcastResponse {
  id: number;
  chunks_used: InsightResult[];
}

// Audio response type for the audio endpoint
export interface PodcastAudioResponse {
  audio_url: string;
}

// Kept for compatibility with existing imports; same shape as PodcastResponse now
export interface PodcastDetailResponse {
  id: number;
  audio_url: string;
  chunks_used: InsightResult[];
}

// Error response type
export interface ErrorResponse {
  error: string;
}


