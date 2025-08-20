# PDF Viewer Application - API Flow Documentation

## Overview
This document details the complete flow of API calls, function interactions, and data handling in the PDF viewer application. The application supports multiple AI modes (search, insights, podcast, backend) and handles file uploads, searches, and content generation.

## Table of Contents
1. [File Upload Flow](#file-upload-flow)
2. [Search Mode Flow](#search-mode-flow)
3. [Insights Mode Flow](#insights-mode-flow)
4. [Podcast Mode Flow](#podcast-mode-flow)
5. [Backend Mode Flow](#backend-mode-flow)
6. [File Fetching Flow](#file-fetching-flow)
7. [API Endpoints Reference](#api-endpoints-reference)
8. [Function Call Hierarchy](#function-call-hierarchy)

---

## File Upload Flow

### 1. User Uploads Files
**Trigger**: User selects PDF files in the file input
**Function**: `handleFileUpload(event: React.ChangeEvent<HTMLInputElement>)`

**Parameters**:
- `event.target.files`: FileList of selected PDF files

**Flow**:
1. **Filter PDFs**: `Array.from(uploadedFiles).filter(file => file.type === "application/pdf")`
2. **Update State**: `setFiles(validPDFs)`
3. **Clear Search Results**: `setSearchResults([])`, `setActiveResultId(null)`
4. **Upload to Backend**: `handleMultiplePdfsUploadToBackend(validPDFs)`

### 2. Multiple PDFs Upload
**Function**: `handleMultiplePdfsUploadToBackend(files: File[])`

**Parameters**:
- `files`: Array of File objects (PDFs)

**Flow**:
1. **Create FormData**: `new FormData()`
2. **Add Files**: `formData.append('files[]', file)` for each file
3. **API Call**: `apiClient.uploadMultiplePdfs(formData)`
4. **Endpoint**: `POST /api/upload/batch`
5. **Response**: `BatchUploadResponse` with array of `FileUploadResponse`

**API Response Structure**:
```typescript
{
  files: [
    {
      id: number,
      filename: string,
      uploaded_at: string,
      num_pages: number
    }
  ]
}
```

---

## Search Mode Flow

### 1. User Sends Search Query
**Trigger**: User types message in search mode and clicks send
**Function**: `handleSendMessage(message: string)`

**Parameters**:
- `message`: User's search query string

**Flow**:
1. **Validate File Selection**: Check if `selectedFile` exists
2. **Add User Message**: Create `ChatMessage` with type 'user'
3. **Set Processing**: `setIsProcessingQuery(true)`
4. **Backend Search**: `backendSearch(message)`
5. **Upload File**: `apiClient.uploadFile(selectedFile)` or find existing
6. **Generate Insights**: `apiClient.generateInsights(params)` with query as selected_text
7. **Poll for Completion**: `apiClient.pollInsights(selection_id)`
8. **Map Results**: Convert insights results to `SearchResultItem[]`
9. **Add Bot Message**: Create success message
10. **Auto-Execute First**: `handleResultClick(firstResult, true)`

### 2. Search Result Click
**Function**: `handleResultClick(result: SearchResultItem, autoExecute = false)`

**Parameters**:
- `result`: SearchResultItem with file info and search content
- `autoExecute`: Boolean to auto-execute search

**Flow**:
1. **Set Active**: `setActiveResultId(result.id)`
2. **Update Visual State**: Mark result as active
3. **Find Local File**: `files.find(file => file.name === result.filename)`
4. **If Not Found**: Trigger file fetching from backend
5. **Switch PDF**: `setSelectedFile(targetFile)` if different
6. **Execute Search**: `executeDirectSearchForResult(result)` if PDF loaded

### 3. Direct Search Execution
**Function**: `executeDirectSearchForResult(result: SearchResultItem)`

**Parameters**:
- `result`: SearchResultItem with search parameters

**Flow**:
1. **Check Viewer Ready**: Ensure `currentViewer` and `pdfLoadedFileName` exist
2. **Set Searching State**: `setIsDirectSearching(true)`
3. **Perform Search**: `performDirectSearch(currentViewer, result.pageNo, result.contentToSearch, result.annotationToAdd)`
4. **Adobe SDK Call**: Uses Adobe PDF Viewer SDK for actual search
5. **Handle Results**: Success/failure callbacks

---

## Insights Mode Flow

### 1. User Generates Insights
**Trigger**: User types message in insights mode and clicks send
**Function**: `handleGenerateInsights(message: string)`

**Parameters**:
- `message`: User's prompt for insights generation

**Flow**:
1. **Validate Selection**: Check `selectedContent?.data` and `selectedFile`
2. **Add User Message**: Create `ChatMessage` with type 'user'
3. **Set Processing**: `setIsProcessingQuery(true)`
4. **Upload File**: `apiClient.uploadFile(selectedFile)` or find existing
5. **Generate Insights**: `apiClient.generateInsights(params)`
6. **Poll for Completion**: `apiClient.pollInsights(selection_id)`
7. **Format Response**: Create display content
8. **Add to Search Results**: Convert insights to clickable results
9. **Add Bot Message**: Display insights content

### 2. Search API Calls (Using Insights Endpoint)

#### Generate Insights for Search
**Function**: `apiClient.generateInsights(params: InsightRequest)`
**Endpoint**: `POST /api/insights`
**Parameters**:
```typescript
{
  file_id: number,
  page_number: number, // Usually 1 for general search
  selected_text: string // The search query
}
```
**Response**:
```typescript
{
  selection_id: string,
  status: 'pending'
}
```

#### Poll Insights for Search Results
**Function**: `apiClient.pollInsights(selection_id: string)`
**Endpoint**: `GET /api/insights/:selection_id`
**Response**:
```typescript
{
  selection_id: string,
  status: 'done',
  summary: string,
  results: [
    {
      id: number,
      file_id: number,
      page_number: number,
      summary: string,
      text: string
    }
  ]
}
```

### 3. Search Results from Insights
**Conversion**: Insights results are converted to `SearchResultItem[]`:
```typescript
const mapped: SearchResultItem[] = (insights.results || []).map((result, index) => ({
  id: `search_${result.id}_${Date.now()}`,
  filename: selectedFile.name,
  pageNo: result.page_number,
  contentToSearch: result.text,
  annotationToAdd: result.summary,
  isActive: false,
}));
```

---

## Podcast Mode Flow

### 1. User Generates Podcast
**Trigger**: User types message in podcast mode and clicks send
**Function**: `handleGeneratePodcast(message: string)`

**Parameters**:
- `message`: User's prompt for podcast generation

**Flow**:
1. **Validate Selection**: Check `selectedContent?.data` and `selectedFile`
2. **Add User Message**: Create `ChatMessage` with type 'user'
3. **Set Processing**: `setIsProcessingQuery(true)`
4. **Clear Audio**: `setAudioUrl(undefined)`
5. **Upload File**: `apiClient.uploadFile(selectedFile)` or find existing
6. **Generate Insights First**: `apiClient.generateInsights(params)`
7. **Poll Insights**: `apiClient.pollInsights(selection_id)`
8. **Generate Podcast**: `apiClient.generatePodcast(params)`
9. **Poll Podcast**: `apiClient.pollPodcast(podcast_id)`
10. **Set Audio URL**: `setAudioUrl(podcast.audio_url)`
11. **Add Chunks to Results**: Convert podcast chunks to clickable results
12. **Add Bot Message**: Display podcast content

### 2. Podcast API Calls

#### Generate Podcast
**Function**: `apiClient.generatePodcast(params: PodcastRequest)`
**Endpoint**: `POST /api/podcast`
**Parameters**:
```typescript
{
  selection_id: string,
  voice: string
}
```
**Response**:
```typescript
{
  id: number,
  status: 'PENDING'
}
```

#### Poll Podcast
**Function**: `apiClient.pollPodcast(podcast_job_id: number)`
**Endpoint**: `GET /api/podcast/:podcast_job_id`
**Response**:
```typescript
{
  id: number,
  status: 'DONE',
  audio_url: string,
  chunks_used: [
    {
      id: number,
      file_id: number,
      page_number: number,
      summary: string,
      text: string
    }
  ]
}
```

### 3. Podcast Chunks to Search Results
**Conversion**: Podcast chunks are converted to `SearchResultItem[]`:
```typescript
const newSearchResults: SearchResultItem[] = podcast.chunks_used.map((chunk, index) => ({
  id: `podcast_chunk_${chunk.id}_${Date.now()}`,
  filename: selectedFile.name,
  pageNo: chunk.page_number,
  contentToSearch: chunk.text,
  annotationToAdd: chunk.summary,
  isActive: false,
}));
```

---

## Backend Mode Flow

### 1. User Sends to Backend
**Trigger**: User types message in backend mode and clicks send
**Function**: `handleBackendRequest(prompt: string)` (in LeftSidebar)

**Parameters**:
- `prompt`: User's prompt for backend processing

**Flow**:
1. **Validate Selection**: Check `selectedContent?.data`
2. **Show Error**: If no content selected
3. **Upload to Backend**: `onUploadToBackend(prompt, selectedContent.data, filename, pageNo)`
4. **API Call**: `apiClient.uploadSelectedText(params)`
5. **Show Success/Error**: Display result in chat

### 2. Backend Upload
**Function**: `handleUploadToBackend(prompt: string, selectedText: string, filename: string, pageNo: number)`
**API Call**: `apiClient.uploadSelectedText(params)`
**Endpoint**: Legacy endpoint (not in new API spec)

---

## File Fetching Flow

### 1. File Not Found Locally
**Trigger**: When `handleResultClick` can't find file in local `files` array
**Function**: File fetching logic in `handleResultClick`

**Flow**:
1. **Check Local Files**: `files.find(file => file.name === result.filename)`
2. **If Not Found**: Fetch from backend
3. **Get All Files**: `apiClient.getAllFiles()`
4. **Find by Name**: `backendFiles.find(f => f.filename === result.filename)`
5. **Get Raw File**: `apiClient.getFileRaw(backendFile.id)`
6. **Create File Object**: `new File([fileBlob], backendFile.filename, { type: 'application/pdf' })`
7. **Add to Local**: `setFiles(prev => [...prev, targetFile])`
8. **Continue Search**: Proceed with search execution

### 2. File Fetching API Calls

#### Get All Files
**Function**: `apiClient.getAllFiles()`
**Endpoint**: `GET /api/files`
**Response**:
```typescript
[
  {
    id: number,
    filename: string,
    uploaded_at: string,
    num_pages: number
  }
]
```

#### Get Raw File
**Function**: `apiClient.getFileRaw(file_id: number)`
**Endpoint**: `GET /api/files/:file_id/raw`
**Response**: PDF file blob

---

## API Endpoints Reference

### File Management
- `POST /api/upload` - Upload single PDF
- `POST /api/upload/batch` - Upload multiple PDFs
- `GET /api/files` - Get all files
- `GET /api/files/:file_id` - Get file info
- `GET /api/files/:file_id/raw` - Get raw PDF bytes
- `DELETE /api/files/:file_id` - Delete file

### Insights
- `POST /api/insights` - Generate insights
- `GET /api/insights/:selection_id` - Get insight status/results
- `GET /api/chunks/:chunk_id` - Get chunk details

### Podcast
- `POST /api/podcast` - Generate podcast
- `GET /api/podcast/:podcast_job_id` - Get podcast status/results

### Error Response Format
All endpoints return error responses as:
```typescript
{
  error: string
}
```

---

## Function Call Hierarchy

### Main Component (Jain.tsx)
```
PdfViewerPage
├── handleFileUpload
│   └── handleMultiplePdfsUploadToBackend
│       └── apiClient.uploadMultiplePdfs
├── handleSendMessage (Search Mode)
│   ├── backendSearch
│   │   ├── apiClient.uploadFile
│   │   ├── apiClient.generateInsights
│   │   └── apiClient.pollInsights
│   └── handleResultClick
│       └── executeDirectSearchForResult
│           └── performDirectSearch (Adobe SDK)
├── handleGenerateInsights (Insights Mode)
│   ├── apiClient.uploadFile
│   ├── apiClient.generateInsights
│   ├── apiClient.pollInsights
│   └── Convert results to SearchResultItem[]
├── handleGeneratePodcast (Podcast Mode)
│   ├── apiClient.uploadFile
│   ├── apiClient.generateInsights
│   ├── apiClient.pollInsights
│   ├── apiClient.generatePodcast
│   ├── apiClient.pollPodcast
│   └── Convert chunks to SearchResultItem[]
└── handleResultClick (Universal)
    ├── Find file locally or fetch from backend
    │   ├── apiClient.getAllFiles
    │   └── apiClient.getFileRaw
    └── executeDirectSearchForResult
```

### LeftSidebar Component
```
LeftSidebar
├── handleSendMessage
│   ├── handleBackendRequest (Backend Mode)
│   │   └── onUploadToBackend
│   ├── onGeneratePodcast (Podcast Mode)
│   └── onGenerateInsights (Insights Mode)
└── onResultClick
    └── handleResultClick (in Jain.tsx)
```

### API Client (client.ts)
```
apiClient
├── File Operations
│   ├── uploadFile
│   ├── uploadBatch
│   ├── getAllFiles
│   ├── getFileInfo
│   ├── getFileRaw
│   └── deleteFile
├── Insights Operations
│   ├── generateInsights
│   ├── getInsights
│   ├── pollInsights
│   └── getChunk
├── Podcast Operations
│   ├── generatePodcast
│   ├── getPodcast
│   └── pollPodcast
└── Legacy Operations
    ├── uploadSelectedText
    ├── searchQuery
    ├── askOnlineAI
    └── getInitialSidebarData
```

---

## Key Data Structures

### SearchResultItem
```typescript
{
  id: string,
  filename: string,
  pageNo: number,
  contentToSearch: string,
  annotationToAdd: string,
  isActive?: boolean
}
```

### ChatMessage
```typescript
{
  id: string,
  type: 'user' | 'bot',
  content: string,
  timestamp: number
}
```

### SelectedContentData
```typescript
{
  type: string,
  data: string,
  timestamp: number,
  pageNo?: number
}
```

---

## Error Handling

### File Upload Errors
- Invalid file type filtering
- Network errors during upload
- Backend validation errors

### Search Errors
- File not found locally or in backend
- Adobe SDK search failures
- Network errors during API calls

### AI Mode Errors
- No content selected validation
- API timeout errors
- Polling failures for long-running operations
- Backend processing errors

### File Fetching Errors
- File not found in backend
- Network errors during file download
- Invalid file blob creation

---

## State Management

### Global State (Jain.tsx)
- `files`: Array of uploaded PDF files
- `selectedFile`: Currently selected PDF
- `currentViewer`: Adobe PDF viewer instance
- `searchResults`: Array of search/insight/podcast results
- `chatMessages`: Array of chat messages
- `aiMode`: Current AI mode ('search' | 'insights' | 'podcast' | 'backend')
- `selectedContent`: Currently selected text from PDF
- `audioUrl`: Generated podcast audio URL

### Local State (LeftSidebar.tsx)
- `messageInput`: Current input text
- `typingMessageId`: ID of message being typed
- `typedContent`: Current typed content for animation

---

## Performance Considerations

### File Upload
- Batch upload for multiple files
- Progress tracking for large files
- Error recovery for failed uploads

### Search Operations
- Debounced search for real-time queries
- Caching of search results
- Lazy loading of PDF content

### AI Operations
- Polling with exponential backoff
- Timeout handling for long operations
- Progress indicators for user feedback

### Memory Management
- Cleanup of Adobe viewer instances
- Proper disposal of file blobs
- State cleanup on component unmount
