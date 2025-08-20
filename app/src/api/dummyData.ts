// Dummy data generators extracted from client.ts
// These are used as fallbacks when API calls fail or during development.

import type {
  FileUploadResponse,
  BatchUploadResponse,
  FileInfo,
  InsightRequest,
  InsightResponse,
  InsightDetailResponse,
  InsightResult,
  ChunkResponse,
  PodcastRequest,
  PodcastResponse,
  PodcastDetailResponse,
} from './apiTypes';

// ----------------------------------------------------------------------------
// In-memory stores to keep per-request dummy data unique between calls
// ----------------------------------------------------------------------------

type InsightStoreEntry = {
  detail: InsightDetailResponse;
  createdAt: number;
};

const insightStore: Map<string, InsightStoreEntry> = new Map();

type PodcastStoreEntry = {
  detail: PodcastDetailResponse;
  createdAt: number;
};

const podcastStore: Map<number, PodcastStoreEntry> = new Map();

let dummyAutoId = 1000;
const nextId = (): number => (++dummyAutoId);

const randomPick = <T,>(arr: T[], n: number): T[] => {
  const copy = [...arr];
  const result: T[] = [];
  while (copy.length && result.length < n) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
};

const makeInsightResults = (fileId: number, basePage: number, seedText: string, count: number): InsightDetailResponse['results'] => {
  const words = seedText.split(/\s+/).filter(Boolean);
  const results: NonNullable<InsightDetailResponse['results']> = [];
  for (let i = 0; i < count; i++) {
    const picked = randomPick(words, Math.max(2, Math.min(6, Math.floor(Math.random() * 6) + 2)));
    const phrase = picked.join(' ');
    const id = nextId();
    results.push({
      id,
      file_id: fileId,
      page_number: Math.max(1, basePage + Math.floor(Math.random() * 5) - 2),
      summary: `Insight ${i + 1}: ${phrase || 'Key concept'}`,
      text: `${phrase || 'Selected content'} — related discussion and elaboration ${Math.random().toString(36).slice(2, 8)}.`
    });
  }
  return results;
};

export const generateDummyFileUploadResponse = async (file: File): Promise<FileUploadResponse> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return {
    file_id: Math.floor(Math.random() * 1000) + 100,
    filename: file.name,
    uploaded_at: new Date().toISOString(),
    num_pages: Math.floor(Math.random() * 50) + 10
  };
};

export const generateDummyBatchUploadResponse = async (files: File[]): Promise<BatchUploadResponse> => {
  await new Promise(resolve => setTimeout(resolve, 400));
  const filesResponse: FileUploadResponse[] = files.map((file, index) => ({
    file_id: Math.floor(Math.random() * 1000) + 100 + index,
    filename: file.name,
    uploaded_at: new Date().toISOString(),
    num_pages: Math.floor(Math.random() * 1000) + 10
  }));
  return { files: filesResponse };
};

export const generateDummyFileInfo = async (fileId: number): Promise<FileInfo> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  return {
    id: fileId,
    filename: `dummy_file_${fileId}.pdf`,
    uploaded_at: new Date().toISOString(),
    num_pages: Math.floor(Math.random() * 50) + 10
  };
};

export const generateDummyPdfBlob = async (): Promise<Blob> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  return new Blob(['dummy pdf content'], { type: 'application/pdf' });
};

export const generateDummyFileList = async (): Promise<FileInfo[]> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  return [
    {
      id: 123,
      filename: 'lecture1.pdf',
      uploaded_at: '2025-08-14T10:00:00Z',
      num_pages: 25
    },
    {
      id: 124,
      filename: 'lecture2.pdf',
      uploaded_at: '2025-08-14T11:00:00Z',
      num_pages: 30
    },
    {
      id: 125,
      filename: 'document.pdf',
      uploaded_at: '2025-08-14T12:00:00Z',
      num_pages: 15
    }
  ];
};

export const generateDummyDeleteFileResponse = async (): Promise<{ deleted: boolean }> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  return { deleted: true };
};

// Immediate insights response (no polling)
export const generateDummyInsightResponse = async (_params: InsightRequest): Promise<InsightResponse> => {
  await new Promise(resolve => setTimeout(resolve, 150));
  return {
    summary: 'This is a comprehensive analysis of the selected content covering key concepts, important definitions, and critical insights that will help understand the main topics discussed in the document.',
    results: [
      {
        id: 987,
        file_id: 123,
        page_number: 4,
        summary: 'Key concepts overviewaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        text: 'view of the most important concepts discussed in the document including context, motivation, and core definitiAn overons.'
      },
      {
        id: 988,
        file_id: 123,
        page_number: 4,
        summary: 'Algorithm classification and types',
        text: 'Machine learning algorithms can be classified into supervised, unsupervised, and reinforcement learning, each serving different applications.'
      },
      {
        id: 989,
        file_id: 123,
        page_number: 4,
        summary: 'Real-world applications and examples',
        text: 'Use-cases include recommendation systems, image recognition, NLP, and autonomous systems that transform multiple industries.'
      },
      {
        id: 990,
        file_id: 123,
        page_number: 4,
        summary: 'Performance metrics and evaluation',
        text: 'Metrics such as accuracy, precision, recall, and F1-score help evaluate model performance depending on the problem context.'
      },
      {
        id: 991,
        file_id: 123,
        page_number: 4,
        summary: 'Future trends and challenges',
        text: 'Trends include deep learning and explainable AI; challenges remain around data privacy, bias, and interpretability.'
      }
    ]
  };
};

// Legacy detail generator retained for compatibility (unused in immediate flow)
export const generateDummyInsightDetailResponse = async (selectionId: string): Promise<InsightDetailResponse> => {
  await new Promise(resolve => setTimeout(resolve, 150));
  return {
    summary: 'This is a comprehensive analysis of the selected content covering key concepts, important definitions, and critical insights that will help understand the main topics discussed in the document.',
    results: [
      {
        id: 987,
        file_id: 123,
        page_number: 1,
        summary: 'this is summary',
        text: 'minakshi'
      },
      {
        id: 988,
        file_id: 123,
        page_number: 5,
        summary: 'Algorithm classification and types',
        text: 'Machine learning algorithms can be broadly classified into three categories: supervised learning, unsupervised learning, and reinforcement learning. Each type serves different purposes and applications.'
      },
      {
        id: 989,
        file_id: 123,
        page_number: 6,
        summary: 'Real-world applications and examples',
        text: 'Practical applications of machine learning include recommendation systems, image recognition, natural language processing, and autonomous vehicles. These technologies are transforming various industries.'
      },
      {
        id: 990,
        file_id: 123,
        page_number: 7,
        summary: 'Performance metrics and evaluation',
        text: 'Evaluating machine learning models requires careful consideration of metrics such as accuracy, precision, recall, and F1-score. The choice of metrics depends on the specific problem and requirements.'
      },
      {
        id: 991,
        file_id: 123,
        page_number: 8,
        summary: 'Future trends and challenges',
        text: 'Emerging trends in machine learning include deep learning, federated learning, and explainable AI. However, challenges such as data privacy, bias, and interpretability remain significant concerns.'
      }
    ]
  };
};

export const generateDummyChunkResponse = async (chunkId: number): Promise<ChunkResponse> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  return {
    id: chunkId,
    file_id: 123,
    page_number: Math.floor(Math.random() * 10) + 1,
    text: 'This is a sample chunk of text from the document that contains important information about the topic being discussed. It includes key concepts and definitions that are relevant to understanding the subject matter.',
    summary: 'Important concept explanation and key definitions'
  };
};

// Immediate podcast response (no polling)
export const generateDummyPodcastResponse = async (_params: PodcastRequest): Promise<PodcastResponse> => {
  await new Promise(resolve => setTimeout(resolve, 150));
  return {
    id: 42,
    chunks_used: [
      {
        id: 987,
        file_id: 123,
        page_number: 1,
        summary: 'minakshi',
        text: 'minakshi'
      },
      {
        id: 988,
        file_id: 123,
        page_number: 1,
        summary: 'Algorithm classification and types',
        text: 'Machine learning'
      },
      {
        id: 989,
        file_id: 123,
        page_number: 1,
        summary: 'Real-world applications and examples',
        text: 'yash'
      },
      {
        id: 990,
        file_id: 123,
        page_number: 7,
        summary: 'Performance metrics and evaluation',
        text: 'Evaluating machine learning models requires careful consideration of metrics such as accuracy, precision, recall, and F1-score. The choice of metrics depends on the specific problem and requirements.'
      },
      {
        id: 991,
        file_id: 123,
        page_number: 8,
        summary: 'Future trends and challenges',
        text: 'Emerging trends in machine learning include deep learning, federated learning, and explainable AI. However, challenges such as data privacy, bias, and interpretability remain significant concerns.'
      }
    ]
  };
};

export const generateDummyPodcastDetailResponse = async (podcastJobId: number): Promise<PodcastDetailResponse> => {
  await new Promise(resolve => setTimeout(resolve, 150));
  return {
    id: podcastJobId || 42,
    audio_url: 'https://example.com/audio/podcast_123.mp4',
    chunks_used: [
      {
        id: 987,
        file_id: 123,
        page_number: 1,
        summary: 'minakshi',
        text: 'minakshi'
      },
      {
        id: 988,
        file_id: 123,
        page_number: 1,
        summary: 'Algorithm classification and types',
        text: 'Machine learning'
      },
      {
        id: 989,
        file_id: 123,
        page_number: 1,
        summary: 'Real-world applications and examples',
        text: 'yash'
      },
      {
        id: 990,
        file_id: 123,
        page_number: 7,
        summary: 'Performance metrics and evaluation',
        text: 'Evaluating machine learning models requires careful consideration of metrics such as accuracy, precision, recall, and F1-score. The choice of metrics depends on the specific problem and requirements.'
      },
      {
        id: 991,
        file_id: 123,
        page_number: 8,
        summary: 'Future trends and challenges',
        text: 'Emerging trends in machine learning include deep learning, federated learning, and explainable AI. However, challenges such as data privacy, bias, and interpretability remain significant concerns.'
      }
    ]
  };
};


