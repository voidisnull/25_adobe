// Centralized API client for backend calls and shared response types
// Adjust BASE_URL to your backend host/port

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8081';

import axios from 'axios';

// Shared API types
import type {
	FileUploadResponse,
	BatchUploadResponse,
	FileInfo,
	InsightRequest,
	InsightResponse,
	ChunkResponse,
	PodcastRequest,
	PodcastResponse,
	PodcastAudioResponse,
} from './apiTypes';
export type {
	FileUploadResponse,
	BatchUploadResponse,
	FileInfo,
	InsightRequest,
	InsightResponse,
	// Keep exporting legacy types for compatibility even if not used here
	InsightResult,
	InsightDetailResponse,
	ChunkResponse,
	PodcastRequest,
	PodcastResponse,
	PodcastDetailResponse,
	PodcastAudioResponse,
	ErrorResponse,
} from './apiTypes';

// Legacy types for backward compatibility (keeping these for UI functionality)
export type AiMode = 'search' | 'podcast' | 'insights';

// Removed legacy types that are no longer used by the app

// =============================================================================
// API CLIENT IMPLEMENTATION
// =============================================================================

const toJson = async (response: any) => response.data;

// Dummy fallbacks
import {
	generateDummyFileUploadResponse,
	generateDummyBatchUploadResponse,
	generateDummyFileInfo,
	generateDummyPdfBlob,
	generateDummyFileList,
	generateDummyDeleteFileResponse,
	generateDummyInsightResponse,
	generateDummyChunkResponse,
	generateDummyPodcastResponse,
} from './dummyData';

export const apiClient = {
	// =============================================================================
	// FILE UPLOAD ENDPOINTS
	// =============================================================================

	/**
	 * Upload a single PDF file
	 * POST /api/upload
	 */
	async uploadFile(file: File): Promise<FileUploadResponse> {
		try {
			const form = new FormData();
			form.append('file', file);
			const res = await axios.post(`${BASE_URL}/api/upload`, form, {
				headers: { 'Content-Type': 'multipart/form-data' },
			});
			return await toJson(res);
		} catch (err) {
			return generateDummyFileUploadResponse(file);
		}
	},

	/**
	 * Upload multiple PDF files in batch
	 * POST /api/upload/batch
	 */
	async uploadBatch(files: File[]): Promise<BatchUploadResponse> {
		try {
			const form = new FormData();
			files.forEach(f => form.append('files[]', f));
			const res = await axios.post(`${BASE_URL}/api/upload/batch`, form, {
				headers: { 'Content-Type': 'multipart/form-data' },
			});
			return await toJson(res);
		} catch (err) {
			return generateDummyBatchUploadResponse(files);
		}
	},

	// =============================================================================
	// FILE MANAGEMENT ENDPOINTS
	// =============================================================================

	/**
	 * Get information about a specific file
	 * GET /api/files/:file_id
	 */
	async getFileInfo(fileId: number): Promise<FileInfo> {
		try {
			const res = await axios.get(`${BASE_URL}/api/files/${fileId}`);
			return await toJson(res);
		} catch (err) {
			return generateDummyFileInfo(fileId);
		}
	},

	/**
	 * Get the raw PDF content of a file
	 * GET /api/files/:file_id/raw
	 */
	async getFileRaw(fileId: number): Promise<Blob> {
		try {
			const res = await axios.get(`${BASE_URL}/api/files/${fileId}/raw`, {
				responseType: 'blob',
			});
			return res.data as Blob;
		} catch (err) {
			return generateDummyPdfBlob();
		}
	},

	/**
	 * Get list of all uploaded files
	 * GET /api/files
	 */
	async getAllFiles(): Promise<FileInfo[]> {
		try {
			const res = await axios.get(`${BASE_URL}/api/files`);
			return await toJson(res);
		} catch (err) {
			return generateDummyFileList();
		}
	},

	/**
	 * Delete a file
	 * DELETE /api/files/:file_id
	 */
	async deleteFile(fileId: number): Promise<{ deleted: boolean }> {
		try {
			const res = await axios.delete(`${BASE_URL}/api/files/${fileId}`);
			return await toJson(res);
		} catch (err) {
			return generateDummyDeleteFileResponse();
		}
	},

	// =============================================================================
	// INSIGHTS ENDPOINTS
	// =============================================================================

	/**
	 * Generate insights from selected text (immediate response)
	 * POST /api/insights
	 */
	async generateInsights(params: InsightRequest): Promise<InsightResponse> {
		try {
			const res = await axios.post(`${BASE_URL}/api/insights`, params);
			return await toJson(res);
		} catch (err) {
			return generateDummyInsightResponse(params);
		}
	},

	// =============================================================================
	// CHUNK ENDPOINTS
	// =============================================================================

	/**
	 * Get specific chunk information
	 * GET /api/chunks/:chunk_id
	 */
	async getChunk(chunkId: number): Promise<ChunkResponse> {
		try {
			const res = await axios.get(`${BASE_URL}/api/chunks/${chunkId}`);
			return await toJson(res); 
		} catch (err) {
			return generateDummyChunkResponse(chunkId);
		}
	},

	// =============================================================================
	// PODCAST ENDPOINTS
	// =============================================================================

	/**
	 * Generate podcast (immediate response)
	 * POST /api/podcast
	 */
	async generatePodcast(params: PodcastRequest): Promise<PodcastResponse> {
		try {
			const res = await axios.post(`${BASE_URL}/api/podcasts`, params);
			return await toJson(res);
		} catch (err) {
			return generateDummyPodcastResponse(params);
		}
	},

	/**
	 * Get podcast audio file
	 * GET /api/podcasts/:podcast_id/audio
	 */
	async getPodcastAudio(podcastId: number): Promise<Blob> {
		try {
			const res = await axios.get(`${BASE_URL}/api/podcasts/${podcastId}/audio`, {
				responseType: 'blob',
			});
			return res.data as Blob;
		} catch (err) {
			throw new Error(`Failed to fetch podcast audio: ${err}`);
		}
	},
};

// Export the API client
export { apiClient as default };