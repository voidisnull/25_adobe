import React, { useEffect, useRef, useState } from "react";
import IconSidebar, { SidebarMode } from "./IconSidebar";
import FilesPanel from "./FilesPanel";
import SearchPanel from "./SearchPanel";
import PodcastPanel from "./PodcastPanel";
import InsightsPanel from "./InsightsPanel";
import RightPdfViewer from "./RightSidebar";
import {
  SelectedContentData,
  ChatMessage,
  SearchResultItem
} from "./LeftSidebar";
import {
  AdobeViewer,
  loadAdobeSDK,
  loadPdfWithAdobe,
  setupSelectionMonitoring,
  performDirectSearch,
} from "./adobePdfFunction";
import { apiClient, type AiMode } from "./api/client";
import type { InsightResult } from "./api/apiTypes";
import Loader from "./Loader";
import { toast } from "react-toastify";

const PdfViewerPage: React.FC = () => {
  const adobeDivId = "adobe-dc-view";
  const viewerRef = useRef<HTMLDivElement>(null);
  const isCheckingSelection = useRef<boolean>(false);
  const selectionInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Main layout state
  const [activeMode, setActiveMode] = useState<SidebarMode>('files');
  
  // File and PDF states
  const [files, setFiles] = useState<File[]>([]);
  const [fileIdMap, setFileIdMap] = useState<Map<string, File>>(new Map()); // Backend file ID -> File object mapping
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  const [currentViewer, setCurrentViewer] = useState<AdobeViewer | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState<boolean>(false);
  const [pdfLoadedFileName, setPdfLoadedFileName] = useState<string | null>(null);
  
  // Selected content state
  const [selectedContent, setSelectedContent] = useState<SelectedContentData | null>(null);
  
  // Search mode states
  const [searchChatMessages, setSearchChatMessages] = useState<ChatMessage[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searchActiveResultId, setSearchActiveResultId] = useState<string | null>(null);
  const [isSearchProcessing, setIsSearchProcessing] = useState<boolean>(false);
  const [searchSectionsResults, setSearchSectionsResults] = useState<Record<string, SearchResultItem[]>>({});
  
  // Podcast mode states
  const [podcastChatMessages, setPodcastChatMessages] = useState<ChatMessage[]>([]);
  const [podcastResults, setPodcastResults] = useState<SearchResultItem[]>([]);
  const [podcastActiveResultId, setPodcastActiveResultId] = useState<string | null>(null);
  const [isPodcastProcessing, setIsPodcastProcessing] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined);
  const [podcastSectionsResults, setPodcastSectionsResults] = useState<Record<string, SearchResultItem[]>>({});
  
  // Insights mode states
  const [insightsChatMessages, setInsightsChatMessages] = useState<ChatMessage[]>([]);
  const [insightsResults, setInsightsResults] = useState<SearchResultItem[]>([]);
  const [insightsActiveResultId, setInsightsActiveResultId] = useState<string | null>(null);
  const [isInsightsProcessing, setIsInsightsProcessing] = useState<boolean>(false);
  const [insightsSectionsResults, setInsightsSectionsResults] = useState<Record<string, SearchResultItem[]>>({});
  
  // Direct searching state
  const [isDirectSearching, setIsDirectSearching] = useState<boolean>(false);
  const [isUploadingFiles, setIsUploadingFiles] = useState<boolean>(false);
  const isPanelProcessing = isSearchProcessing || isPodcastProcessing || isInsightsProcessing;

  // Load Adobe SDK script
  useEffect(() => {
    loadAdobeSDK();
  }, []);

  // Cleanup selection interval on unmount
  useEffect(() => {
    return () => {
      if (selectionInterval.current) {
        clearInterval(selectionInterval.current);
      }
    };
  }, []);

  // On first render, fetch previously uploaded files from backend and populate file list
  useEffect(() => {
    const loadExistingFilesFromBackend = async () => {
      try {
        const allFiles = await apiClient.getAllFiles();
        console.log('Fetched existing files from backend:', allFiles);
        if (!allFiles || allFiles.length === 0) return;

        // Fetch raw blobs for each file in parallel
        const results = await Promise.all(
          allFiles.map(async (info) => {
            try {
              console.log('Processing backend file info:', info);
              // Use id from getAllFiles response (different from upload response)
              const fileId = info.id;
              const blob = await apiClient.getFileRaw(fileId);
              const file = new File([blob], info.filename, { type: 'application/pdf' });
              // Attach backend id to File object for convenience (runtime only)
              (file as any).file_id = fileId;
              (file as any).file_id = fileId;
              console.log('Loaded file from backend:', { 
                id: fileId, 
                name: file.name,
                attachedId: (file as any).id,
                attachedFileId: (file as any).file_id
              });
              return { id: fileId, file } as { id: number; file: File };
            } catch (e) {
              console.error('Failed to fetch raw PDF for file id', info.id, e);
              return null;
            }
          })
        );

        const valid = results.filter((r): r is { id: number; file: File } => !!r);
        if (valid.length === 0) return;

        // Add files to local state, avoiding duplicates by filename
        setFiles((prev) => {
          const existingNames = new Set(prev.map((f) => f.name.toLowerCase()));
          const newFiles = valid
            .map((v) => v.file)
            .filter((f) => !existingNames.has(f.name.toLowerCase()));
          if (newFiles.length === 0) return prev;
          return [...prev, ...newFiles];
        });

        // Map backend id -> File for lookup
        setFileIdMap((prev) => {
          const newMap = new Map(prev);
          valid.forEach(({ id, file }) => {
            const key = id.toString();
            if (!newMap.has(key)) {
              newMap.set(key, file);
              console.log('Mapped backend id to file in state:', { id, name: file.name });
            }
          });
          return newMap;
        });
      } catch (error) {
        console.error('Failed to load existing files from backend:', error);
      }
    };

    loadExistingFilesFromBackend();
  }, []);

  // Render the selected PDF
  useEffect(() => {
    if (!selectedFile || !(window as any).AdobeDC) return;

    const loadPdf = async () => {
      console.log(`Starting to load PDF: ${selectedFile.name}`);
      setIsPdfLoading(true);
      
      // Clear existing search state and viewer BEFORE loading new PDF
      if (currentViewer) {
        console.log("Clearing existing viewer and search state");
        try {
          if (selectionInterval.current) {
            clearInterval(selectionInterval.current);
          }
        } catch (error) {
          console.log("Error clearing previous viewer state:", error);
        }
      }
      
      // Reset all states
      resetAllStates();

      const currentFileName = selectedFile.name;
      console.log(`📄 About to load PDF: ${currentFileName}`);

      try {
        const adobeViewer = await loadPdfWithAdobe(selectedFile, adobeDivId);
        
        console.log(`✅ PDF loaded successfully: ${currentFileName}`);
        setCurrentViewer(adobeViewer);
        setPdfLoadedFileName(currentFileName);
        setIsPdfLoading(false);
        
        // Set up selection monitoring
        const intervalId = setupSelectionMonitoring(
          adobeViewer, 
          handleSelectionChange,
          isCheckingSelection
        );
        selectionInterval.current = intervalId;
        
      } catch (error) {
        console.error("Error loading PDF:", error);
        setIsPdfLoading(false);
        console.log(`Failed to load PDF: ${currentFileName}`);
        toast.error(`Couldn't open “${currentFileName}”. Please try again.`);
      }
    };

    loadPdf();
  }, [selectedFile]);

  // Helper function to set selected file and its backend ID
  const setSelectedFileWithId = (file: File | null): void => {
    setSelectedFile(file);
    if (file) {
      console.log('setSelectedFileWithId called for file:', file.name);
      console.log('File object properties:', {
        name: file.name,
        size: file.size,
        type: file.type,
        attachedId: (file as any).id,
        attachedFileId: (file as any).file_id
      });
      
      // Try to get the backend ID from the file object first
      let fileId: number | null = null;
      if ((file as any).id != null) {
        fileId = Number((file as any).id);
        console.log('Found backend ID on file object:', { id: fileId, name: file.name });
      } else {
        console.log('No ID found on file object, checking fileIdMap...');
        // Fallback: look up in fileIdMap
        for (const [id, mappedFile] of fileIdMap.entries()) {
          console.log('Checking fileIdMap entry:', { id, mappedFileName: mappedFile.name, currentFileName: file.name });
          if (mappedFile.name === file.name) {
            fileId = parseInt(id);
            console.log('Found backend ID in fileIdMap:', { id: fileId, name: file.name });
            break;
          }
        }
        if (fileId == null) {
          console.log('No ID found in fileIdMap either');
        }
      }
      setSelectedFileId(fileId);
      console.log('Final result - Set selected file with ID:', { name: file.name, id: fileId });
    } else {
      setSelectedFileId(null);
    }
  };

  // Reset all states helper
  const resetAllStates = (): void => {
    setCurrentViewer(null);
    setPdfLoadedFileName(null);
    setSelectedContent(null);
    setSelectedFileId(null);
    if (selectionInterval.current) {
      clearInterval(selectionInterval.current);
      selectionInterval.current = null;
    }
  };

  // Handle selection change
  const handleSelectionChange = (content: SelectedContentData | null): void => {
    if (content && content.data?.trim()) {
      console.log("📋 Text selected:", content);
      setSelectedContent(content);
    }
  };

  // Handle clicking outside to clear selected content
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is outside the panels and not on the PDF viewer
      const target = event.target as Element;
      
      // Don't clear if clicking on PDF viewer or its children
      if (target.closest('#adobe-dc-view')) {
        return;
      }
      
      // Don't clear if clicking on the panels themselves
      if (target.closest('[data-panel="insights"]') || 
          target.closest('[data-panel="podcast"]') || 
          target.closest('[data-panel="search"]')) {
        return;
      }
      
      // Clear selected content if clicking outside
      if (selectedContent) {
        setSelectedContent(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [selectedContent]);

  // Handle multiple PDFs upload to backend using FormData
  const handleMultiplePdfsUploadToBackend = async (files: File[]): Promise<{ [filename: string]: number }> => {
    try {
      console.log(`📤 Creating FormData with ${files.length} PDFs...`);
      
      // Create FormData and append all files
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append('pdfs', file);
        console.log(`📄 Added ${file.name} to FormData (${index + 1}/${files.length})`);
      });

      // Send all files in a single request
      console.log('🚀 Sending all PDFs to backend in one request...');
      const uploadResults = await apiClient.uploadBatch(files);
      
      console.log(`🎉 Successfully uploaded all ${files.length} PDFs to backend!`);
      console.log('Upload response structure:', uploadResults);
      console.log('Upload response files array:', uploadResults.files);
      
      // Convert the response to filename -> file ID mapping
      const fileIdMap: { [filename: string]: number } = {};
      uploadResults.files.forEach((file, index) => {
        console.log(`Processing file ${index}:`, file);
        // Use file_id from backend response
        const fileId = file.file_id;
        console.log(`File ID type: ${typeof fileId}, value: ${fileId}`);
        fileIdMap[file.filename] = fileId;
        // Attach id to the matching File object if present in the input list
        const match = files.find(f => f.name === file.filename);
        if (match) {
          (match as any).id = fileId;
          (match as any).file_id = fileId;
          console.log('Assigned backend id to uploaded file:', { id: fileId, name: match.name });
          console.log('File object after assignment:', { 
            name: match.name, 
            attachedId: (match as any).id, 
            attachedFileId: (match as any).file_id 
          });
        } else {
          console.log('No matching file found for:', file.filename);
        }
      });
      
      setSelectedFileWithId(files[0]);
      return fileIdMap;
    } catch (error: any) {
      console.error("❌ Failed to upload PDFs:", error);
      throw new Error(`Failed to upload PDFs: ${error?.message || error}`);
    }
  };

  // File upload handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const uploadedFiles = event.target.files;
    if (uploadedFiles) {
      const validPDFs = Array.from(uploadedFiles).filter(
        (file: File) => file.type === "application/pdf"
      );
      
      if (validPDFs.length > 0) {
        setIsUploadingFiles(true);
        const uploadingToastId = "uploading";
        toast.loading("Uploading files...", { toastId: uploadingToastId });
        try {
          // Upload all PDFs to backend in a single FormData request
          const fileIdMapping = await handleMultiplePdfsUploadToBackend(validPDFs);
          
          // Update files state - use the files that now have backend IDs attached
          setFiles(prev => [...prev, ...validPDFs]);
          
          // Update file ID mapping
          setFileIdMap(prev => {
            const newMap = new Map(prev);
            validPDFs.forEach(file => {
              if (fileIdMapping[file.name]) {
                newMap.set(fileIdMapping[file.name].toString(), file);
                console.log('Mapped uploaded file id to state:', { id: fileIdMapping[file.name], name: file.name });
                // Double-check that the ID is attached to the file object
                console.log('File object after mapping:', { 
                  name: file.name, 
                  attachedId: (file as any).id, 
                  attachedFileId: (file as any).file_id 
                });
              }
            });
            return newMap;
          });
          const count = validPDFs.length;
          toast.update(uploadingToastId, {
            render: `Uploaded ${count} PDF${count > 1 ? 's' : ''} successfully.`,
            type: "success",
            isLoading: false,
            autoClose: 1000,
            pauseOnHover: false,
            hideProgressBar: true,
            closeOnClick: true,
          });
          
          // Clear search results when new files are uploaded
          setSearchResults([]);
          setSearchActiveResultId(null);
          setPodcastResults([]);
          setPodcastActiveResultId(null);
          setInsightsResults([]);
          setInsightsActiveResultId(null);
          
        } catch (error) {
          console.error("Error uploading PDFs:", error);
          console.log(`❌ Failed to upload PDFs: ${error}`);
          toast.update(uploadingToastId, {
            render: `Upload failed. Please check your connection and try again.`,
            type: "error",
            isLoading: false,
            autoClose: 2000,
            pauseOnHover: false,
            closeOnClick: true,
          });
        } finally {
          setIsUploadingFiles(false);
        }
        
      } else {
        console.log("Please upload valid PDF files.");
        toast.error("Only PDF files are supported. Please choose one or more PDF files.");
      }
    }
  };

  // Search using insights endpoint
  const backendSearch = async (query: string): Promise<SearchResultItem[]> => {
    try {
      if (!selectedFile) {
        throw new Error('No file selected for search');
      }

      // Use the selectedFileId from state
      let fileId: number | null = selectedFileId;

      // If we don't have the ID in state, try to find it
      if (fileId == null) {
        // Try to get the backend ID from the file object first
        if ((selectedFile as any)?.id != null) {
          fileId = Number((selectedFile as any).id);
          console.log('Found backend ID on file object (search):', { id: fileId, name: selectedFile.name });
        } else {
          // Fallback: look up in fileIdMap
          for (const [id, file] of fileIdMap.entries()) {
            if (file.name === selectedFile.name) {
              fileId = parseInt(id);
              console.log('Found backend ID in fileIdMap (search):', { id: fileId, name: selectedFile.name });
              break;
            }
          }
        }

        // If still not found, try to upload and get file info
        if (fileId == null) {
          try {
            const fileInfo = await apiClient.uploadFile(selectedFile);
            fileId = fileInfo.file_id;
            console.log('Uploaded file to get ID (search):', { id: fileId, name: selectedFile.name });
            
            // Update the mapping
            setFileIdMap(prev => {
              const newMap = new Map(prev);
              newMap.set(fileId!.toString(), selectedFile);
              return newMap;
            });
          } catch (uploadError) {
            const allFiles = await apiClient.getAllFiles();
            const fileInfo = allFiles.find(f => f.filename === selectedFile.name);
            if (!fileInfo) {
              throw new Error('Failed to upload or find file');
            }
            fileId = fileInfo.id;
            console.log('Found file in backend list (search):', { id: fileId, name: selectedFile.name });
          }
        }
      }

      // Use insights endpoint for search (immediate response)
      if (fileId == null) {
        throw new Error('Failed to get file ID for search');
      }
      console.log('Calling insights (search path) with:', {
        file_id: fileId,
        page_number: 1,
        selected_text: query
      });
      const insights = await apiClient.generateInsights({
        file_id: fileId,
        page_number: 1,
        selected_text: query
      });

      // Convert insights results to SearchResultItem format
      const insightResults: InsightResult[] = (insights.results || []) as InsightResult[];
      const mapped: SearchResultItem[] = insightResults.map((result: InsightResult) => ({
        id: `search_${result.id}_${Date.now()}`,
        filename: selectedFile.name,
        fileId: fileId.toString(),
        pageNo: result.page_number,
        contentToSearch: result.text,
        annotationToAdd: result.summary,
        isActive: false,
      }));

      return mapped;
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  };

  // Handle search message send
  const handleSendMessage = async (message: string): Promise<void> => {
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: message,
      timestamp: Date.now()
    };
    
    setSearchChatMessages(prev => [...prev, userMessage]);
    setIsSearchProcessing(true);
    
    try {
      if (!selectedFile) {
        toast.error("Please select a PDF to search.");
        const errorMessage: ChatMessage = {
          id: `bot_error_${Date.now()}`,
          type: 'bot',
          content: `⚠️ No file selected!\n\nPlease select a PDF file first before searching.\n\n💡 Tip: Upload and select a PDF file from the file list to enable search functionality.`,
          timestamp: Date.now()
        };
        setSearchChatMessages(prev => [...prev, errorMessage]);
        return;
      }

      const results = await backendSearch(message);
      
      const botMessage: ChatMessage = {
        id: `bot_${Date.now()}`,
        type: 'bot',
        content: `Found ${results.length} relevant results for "${message}" in ${selectedFile.name}. Click on any result below to view it in the PDF.`,
        timestamp: Date.now()
      };
      
      setSearchChatMessages(prev => [...prev, botMessage]);
      setSearchSectionsResults(prev => ({ ...prev, [botMessage.id]: results }));
      setSearchResults(results);
      if (results.length === 0) {
        toast.info("Search not found");
      } else {
        toast.success(`Found ${results.length} result${results.length > 1 ? 's' : ''}.`);
      }
      
      // Automatically select and search the first result
      if (results.length > 0) {
        const firstResult = results[0];
        setSearchActiveResultId(firstResult.id);
        await handleResultClick(firstResult, true);
      }
      
    } catch (error: any) {
      console.error("Error processing query:", error);
      toast.error("We couldn't complete your search. Please try again.");
      
      const errorMessage: ChatMessage = {
        id: `bot_error_${Date.now()}`,
        type: 'bot',
        content: `❌ Search failed: ${error?.message || error}\n\nPlease ensure a PDF file is selected and try again.`,
        timestamp: Date.now()
      };
      
      setSearchChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSearchProcessing(false);
    }
  };

  // Handle result click
  const handleResultClick = async (result: SearchResultItem, autoExecute = false): Promise<void> => {
    if (isDirectSearching) return;
    
    console.log("Result clicked:", result);
    
    // Set active result based on current mode
    if (activeMode === 'search') {
      setSearchActiveResultId(result.id);
      setSearchResults(prev => 
        prev.map(r => ({
          ...r,
          isActive: r.id === result.id
        }))
      );
    } else if (activeMode === 'podcast') {
      setPodcastActiveResultId(result.id);
      setPodcastResults(prev => 
        prev.map(r => ({
          ...r,
          isActive: r.id === result.id
        }))
      );
    } else if (activeMode === 'insights') {
      setInsightsActiveResultId(result.id);
      setInsightsResults(prev => 
        prev.map(r => ({
          ...r,
          isActive: r.id === result.id
        }))
      );
    }
    
    // Find the target file using file ID if available, otherwise fall back to filename
    let targetFile: File | null = null;
    
    if (result.fileId) {
      // Use file ID to find the file
      targetFile = fileIdMap.get(result.fileId) || null;
      console.log(`Looking for file with ID ${result.fileId}: ${targetFile ? 'found' : 'not found'}`);
    }
    
    // If not found by file ID, try to find by filename
    if (!targetFile) {
      const foundFile = files.find(file => 
        file.name.toLowerCase() === result.filename.toLowerCase() ||
        file.name.toLowerCase().includes(result.filename.toLowerCase())
      );
      if (foundFile) {
        targetFile = foundFile;
      }
    }
    
    // If file not found locally, try to get it from backend using fileId
    if (!targetFile && result.fileId) {
      try {
        console.log(`File with ID ${result.fileId} not found locally, fetching from backend...`);
        
        // Directly fetch the specific file using fileId instead of getAllFiles
        const fileBlob = await apiClient.getFileRaw(parseInt(result.fileId));
        targetFile = new File([fileBlob], result.filename, { type: 'application/pdf' });
        
        // Save the file locally
        setFiles(prev => [...prev, targetFile!]);
        
        // Update the file ID mapping
        setFileIdMap(prev => {
          const newMap = new Map(prev);
          newMap.set(result.fileId!, targetFile!);
          return newMap;
        });
        
        console.log(`Successfully fetched file from backend using fileId: ${targetFile.name}`);
        toast.success(`Downloaded “${targetFile.name}” from the server.`);
      } catch (error) {
        console.error("Error fetching file from backend using fileId:", error);
        console.log(`Failed to fetch file "${result.filename}" from backend using fileId ${result.fileId}`);
        toast.error(`Couldn't download “${result.filename}” from the server. Please try again.`);
        return;
      }
    } else if (!targetFile) {
      // Fallback: if no fileId available, show error
      console.log(`PDF "${result.filename}" not found locally and no fileId available for backend fetch`);
      toast.error(`We couldn't find “${result.filename}” on this device, and no server reference was provided.`);
      return;
    }
    
    console.log(`Target PDF found: ${targetFile.name}`);
    
    // Switch to target PDF if different
    if (selectedFile?.name !== targetFile.name) {
      console.log(`Switching to PDF: ${targetFile.name}`);
      setSelectedFileWithId(targetFile);
      toast.info(`Opening “${targetFile.name}”...`);
      return;
    }
    
    // If PDF is already loaded, perform the search
    if (pdfLoadedFileName === targetFile.name && currentViewer && !isPdfLoading) {
      await executeDirectSearchForResult(result);
    }
  };

  // Execute direct search for a specific result
  const executeDirectSearchForResult = async (result: SearchResultItem): Promise<void> => {
    if (!currentViewer || !pdfLoadedFileName) {
      console.log("PDF viewer not ready for search");
      return;
    }
    
    setIsDirectSearching(true);
    
    try {
      console.log(`🔍 Executing search for result: ${result.contentToSearch} on page ${result.pageNo}`);
      
      const searchResult = await performDirectSearch(
        currentViewer,
        result.pageNo,
        result.contentToSearch,
        () => {}, // We don't need search result updates for this use case
        (success: boolean, message: string) => {
          if (success) {
            console.log(`✅ Search completed: ${message}`);
            toast.success(message || "Search completed");
          } else {
            console.log(`❌ Search failed: ${message}`);
            toast.error("Search not found");
          }
        }
      );
      
    } catch (error) {
      console.error("Error executing direct search:", error);
      console.log(`Failed to search for: ${result.contentToSearch}`);
      toast.error(`Something went wrong while searching. Please try again.`);
    } finally {
      setIsDirectSearching(false);
    }
  };

  // Clear chat history for specific mode
  const handleClearChat = (): void => {
    if (activeMode === 'search') {
      setSearchChatMessages([]);
      setSearchResults([]);
      setSearchActiveResultId(null);
    } else if (activeMode === 'podcast') {
      setPodcastChatMessages([]);
      setPodcastResults([]);
      setPodcastActiveResultId(null);
    } else if (activeMode === 'insights') {
      setInsightsChatMessages([]);
      setInsightsResults([]);
      setInsightsActiveResultId(null);
    }
  };

  // Handle podcast generation
  const handleGeneratePodcast = async (message: string): Promise<void> => {
    if (!selectedContent?.data?.trim() || !selectedFile) {
      toast.error("Select text in the PDF before generating a podcast.");
      const errorMessage: ChatMessage = {
        id: `bot_error_${Date.now()}`,
        type: 'bot',
        content: `⚠️ No content selected!\n\nPlease select some text from your PDF before generating podcast.\n\n💡 Tip: Highlight text in the PDF viewer to select content for processing.`,
        timestamp: Date.now()
      };
      setPodcastChatMessages(prev => [...prev, errorMessage]);
      return;
    }

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: message,
      timestamp: Date.now()
    };
    
    setPodcastChatMessages(prev => [...prev, userMessage]);
    setIsPodcastProcessing(true);
    setAudioUrl(undefined);
    
    // Clear selected content immediately when request starts
    setSelectedContent(null);
    
    try {
      let sectionPodcastResults: SearchResultItem[] | undefined;
      // Use the selectedFileId from state
      let fileId: number | null = selectedFileId;

      // If we don't have the ID in state, try to find it
      if (fileId == null) {
        // Try to get the backend ID from the file object first
        if ((selectedFile as any)?.id != null) {
          fileId = Number((selectedFile as any).id);
          console.log('Found backend ID on file object (podcast):', { id: fileId, name: selectedFile.name });
        } else {
          // Fallback: look up in fileIdMap
          for (const [id, file] of fileIdMap.entries()) {
            if (file.name === selectedFile.name) {
              fileId = parseInt(id);
              console.log('Found backend ID in fileIdMap (podcast):', { id: fileId, name: selectedFile.name });
              break;
            }
          }
        }

        // If still not found, try to upload and get file info
        if (fileId == null) {
          try {
            const fileInfo = await apiClient.uploadFile(selectedFile);
            fileId = fileInfo.file_id;
            console.log('Uploaded file to get ID (podcast):', { id: fileId, name: selectedFile.name });
            
            // Update the mapping
            setFileIdMap(prev => {
              const newMap = new Map(prev);
              newMap.set(fileId!.toString(), selectedFile);
              return newMap;
            });
          } catch (uploadError) {
            const allFiles = await apiClient.getAllFiles();
            const fileInfo = allFiles.find(f => f.filename === selectedFile.name);
            if (!fileInfo) {
              throw new Error('Failed to upload or find file');
            }
            fileId = fileInfo.id;
            console.log('Found file in backend list (podcast):', { id: fileId, name: selectedFile.name });
          }
        }
      }

      // Generate podcast first to get the podcast ID
      const podcast = await apiClient.generatePodcast({
        selection_text: selectedContent.data,
        voice: 'default'
      });

      // Now fetch the audio using the podcast ID
      let audioBlob: Blob | null = null;
      try {
        audioBlob = await apiClient.getPodcastAudio(podcast.id);
        // Create object URL for the audio blob
        const audioObjectUrl = URL.createObjectURL(audioBlob);
        setAudioUrl(audioObjectUrl);
      } catch (audioError) {
        console.error("Failed to fetch podcast audio:", audioError);
        // Continue without audio - user will see the chunks
      }

      // Format the podcast response for display
      let podcastContent = `🎙️ **Podcast Generated Successfully!**\n\n`;
      
      if (audioBlob) {
        podcastContent += `**Audio Ready!** 🎵\n\n`;
      } else {
        podcastContent += `**Audio generation in progress...** ⏳\n\n`;
      }

      if (podcast.chunks_used && podcast.chunks_used.length > 0) {
        const topChunks: InsightResult[] = podcast.chunks_used.slice(0, 5);
        podcastContent += `**Chunks Used (${topChunks.length} shown):**\n\n`;
        
        topChunks.forEach((chunk: InsightResult, index: number) => {
          podcastContent += `${index + 1}. **Page ${chunk.page_number}**\n`;
          podcastContent += `   **Summary:** ${chunk.summary}\n`;
          podcastContent += `   **Text:** ${chunk.text.substring(0, 150)}${chunk.text.length > 150 ? '...' : ''}\n\n`;
        });

        // Add the chunks to podcast results for clickable navigation
        if (fileId == null) {
          throw new Error('Failed to get file ID for podcast results');
        }
        const newPodcastResults: SearchResultItem[] = topChunks.map((chunk: InsightResult) => ({
          id: `podcast_chunk_${chunk.id}_${Date.now()}`,
          filename: selectedFile.name,
          fileId: fileId.toString(),
          pageNo: chunk.page_number,
          contentToSearch: chunk.text,
          annotationToAdd: chunk.summary,
          isActive: false,
        }));

        setPodcastResults(newPodcastResults);
        sectionPodcastResults = newPodcastResults;
      }
      
      const botMessage: ChatMessage = {
        id: `bot_${Date.now()}`,
        type: 'bot',
        content: podcastContent,
        timestamp: Date.now()
      };
      
      setPodcastChatMessages(prev => [...prev, botMessage]);
      setPodcastSectionsResults(prev => ({ ...prev, [botMessage.id]: sectionPodcastResults || [] }));
      
      if (audioBlob) {
        toast.success("Podcast is ready with audio!");
      } else {
        toast.success("Podcast generated! Audio will be ready soon.");
      }
      
    } catch (error: any) {
      console.error("Error generating podcast:", error);
      toast.error("We couldn't generate the podcast. Please try again.");
      
      const errorMessage: ChatMessage = {
        id: `bot_error_${Date.now()}`,
        type: 'bot',
        content: `❌ Failed to generate podcast: ${error?.message || error}`,
        timestamp: Date.now()
      };
      
      setPodcastChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsPodcastProcessing(false);
    }
  };

  // Handle add files button click
  const handleAddFiles = (): void => {
    // Create a hidden file input and trigger it
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/pdf';
    fileInput.multiple = true;
    fileInput.style.display = 'none';
    
    fileInput.onchange = (event) => {
      if (event.target instanceof HTMLInputElement) {
        const changeEvent = event as unknown as React.ChangeEvent<HTMLInputElement>;
        handleFileUpload(changeEvent);
      }
      // Clean up
      document.body.removeChild(fileInput);
    };
    
    document.body.appendChild(fileInput);
    fileInput.click();
  };

  // Handle insights generation
  const handleGenerateInsights = async (message: string): Promise<void> => {
    if (!selectedContent?.data?.trim() || !selectedFile) {
      toast.error("Select text in the PDF before generating insights.");
      const errorMessage: ChatMessage = {
        id: `bot_error_${Date.now()}`,
        type: 'bot',
        content: `⚠️ No content selected!\n\nPlease select some text from your PDF before generating insights.\n\n💡 Tip: Highlight text in the PDF viewer to select content for processing.`,
        timestamp: Date.now()
      };
      setInsightsChatMessages(prev => [...prev, errorMessage]);
      return;
    }

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: message,
      timestamp: Date.now()
    };
    
    setInsightsChatMessages(prev => [...prev, userMessage]);
    setIsInsightsProcessing(true);
    
    // Clear selected content immediately when request starts
    setSelectedContent(null);
    
    try {
      let sectionInsightsResults: SearchResultItem[] | undefined;
      // Use the selectedFileId from state
      let fileId: number | null = selectedFileId;

      // If we don't have the ID in state, try to find it
      if (fileId == null) {
        // Try to get the backend ID from the file object first
        if ((selectedFile as any)?.id != null) {
          fileId = Number((selectedFile as any).id);
          console.log('Found backend ID on file object:', { id: fileId, name: selectedFile.name });
        } else {
          // Fallback: look up in fileIdMap
          for (const [id, file] of fileIdMap.entries()) {
            if (file.name === selectedFile.name) {
              fileId = parseInt(id);
              console.log('Found backend ID in fileIdMap:', { id: fileId, name: selectedFile.name });
              break;
            }
          }
        }

        // If still not found, try to upload and get file info
        if (fileId == null) {
          try {
            const fileInfo = await apiClient.uploadFile(selectedFile);
            fileId = fileInfo.file_id;
            console.log('Uploaded file to get ID:', { id: fileId, name: selectedFile.name });
            
            // Update the mapping
            setFileIdMap(prev => {
              const newMap = new Map(prev);
              newMap.set(fileId!.toString(), selectedFile);
              return newMap;
            });
          } catch (uploadError) {
            const allFiles = await apiClient.getAllFiles();
            const fileInfo = allFiles.find(f => f.filename === selectedFile.name);
            if (!fileInfo) {
              throw new Error('Failed to upload or find file');
            }
            fileId = fileInfo.id;
            console.log('Found file in backend list:', { id: fileId, name: selectedFile.name });
          }
        }
      }

      console.log('Calling insights with:', {
        file_id: fileId,
        page_number: selectedContent.pageNo || 1,
        selected_text: selectedContent.data
      });
      // Generate insights using the backend endpoint (immediate response)
      if (fileId == null) {
        throw new Error('Failed to get file ID for insights');
      }
      const insights = await apiClient.generateInsights({
        file_id: fileId,
        page_number: selectedContent.pageNo || 1,
        selected_text: selectedContent.data
      });

      // Format the response for display
      let insightsContent = `💡 **Insights Generated Successfully!**\n\n`;
      
      if (insights.summary) {
        insightsContent += `**Summary:**\n${insights.summary}\n\n`;
      }

      if (insights.results && insights.results.length > 0) {
        const topResults: InsightResult[] = insights.results.slice(0, 5) as InsightResult[];
        insightsContent += `**Key Results (${topResults.length} shown):**\n\n`;
        
        topResults.forEach((result: InsightResult, index: number) => {
          insightsContent += `${index + 1}. **Page ${result.page_number}**\n`;
          insightsContent += `   **Summary:** ${result.summary}\n`;
          insightsContent += `   **Text:** ${result.text.substring(0, 200)}${result.text.length > 200 ? '...' : ''}\n\n`;
        });

        // Add the results to insights results for clickable navigation
        if (fileId == null) {
          throw new Error('Failed to get file ID for insights results');
        }
        const newInsightsResults: SearchResultItem[] = topResults.map((result: InsightResult) => ({
          id: `insight_${result.id}_${Date.now()}`,
          filename: selectedFile.name,
          fileId: fileId.toString(),
          pageNo: result.page_number,
          contentToSearch: result.text,
          annotationToAdd: result.summary,
          isActive: false,
        }));

        setInsightsResults(newInsightsResults);
        sectionInsightsResults = newInsightsResults;
      }
      
      const botMessage: ChatMessage = {
        id: `bot_${Date.now()}`,
        type: 'bot',
        content: insightsContent,
        timestamp: Date.now()
      };
      
      setInsightsChatMessages(prev => [...prev, botMessage]);
      setInsightsSectionsResults(prev => ({ ...prev, [botMessage.id]: sectionInsightsResults || [] }));
      toast.success("Insights are ready.");
      
    } catch (error: any) {
      console.error("Error generating insights:", error);
      toast.error("We couldn't generate insights. Please try again.");
      
      const errorMessage: ChatMessage = {
        id: `bot_error_${Date.now()}`,
        type: 'bot',
        content: `❌ Failed to generate insights: ${error?.message || error}`,
        timestamp: Date.now()
      };
      
      setInsightsChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsInsightsProcessing(false);
    }
  };

  // Removed auto-search to prevent duplicate searches
  // Now searches only happen when user manually clicks a result

  // Render the appropriate panel based on active mode
  const renderActivePanel = () => {
    switch (activeMode) {
      case 'files':
        return (
          <FilesPanel
            files={files}
            selectedFile={selectedFile}
            isPdfLoading={isPdfLoading}
            pdfLoadedFileName={pdfLoadedFileName}
            selectedContent={selectedContent}
            setSelectedFile={setSelectedFileWithId}
            onFileUpload={handleFileUpload}
            isUploading={isUploadingFiles}
          />
        );
      
      case 'search':
        return (
          <SearchPanel
            selectedFile={selectedFile}
            selectedContent={selectedContent}
            chatMessages={searchChatMessages}
            searchResults={searchResults}
            activeResultId={searchActiveResultId}
            isProcessingQuery={isSearchProcessing}
            onSendMessage={handleSendMessage}
            onResultClick={handleResultClick}
            onClearChat={handleClearChat}
            sectionsResultsByBotId={searchSectionsResults}
          />
        );
      
      case 'podcast':
        return (
          <PodcastPanel
            selectedFile={selectedFile}
            selectedContent={selectedContent}
            chatMessages={podcastChatMessages}
            searchResults={podcastResults}
            activeResultId={podcastActiveResultId}
            isProcessingQuery={isPodcastProcessing}
            audioUrl={audioUrl}
            onGeneratePodcast={handleGeneratePodcast}
            onResultClick={handleResultClick}
            onClearChat={handleClearChat}
            sectionsResultsByBotId={podcastSectionsResults}
          />
        );
      
      case 'insights':
        return (
          <InsightsPanel
            selectedFile={selectedFile}
            selectedContent={selectedContent}
            chatMessages={insightsChatMessages}
            searchResults={insightsResults}
            activeResultId={insightsActiveResultId}
            isProcessingQuery={isInsightsProcessing}
            onGenerateInsights={handleGenerateInsights}
            onResultClick={handleResultClick}
            onClearChat={handleClearChat}
            sectionsResultsByBotId={insightsSectionsResults}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="w-screen h-screen flex bg-gradient-to-br from-white via-blue-50 to-white">
      {/* PDF Viewer - Main Content */}
      
      {/* Icon Sidebar */}
      <IconSidebar
        activeMode={activeMode}
        onModeChange={setActiveMode}
        onAddFiles={handleAddFiles}
      />
      
      {/* Active Panel */}
      <div className="w-96 bg-white/95 backdrop-blur border-l border-gray-200 shadow-lg relative">
        {renderActivePanel()}
        {/* {isPanelProcessing && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/60">
            <Loader />
          </div>
        )} */}
      </div>
      <RightPdfViewer
        files={files}
        onFileUpload={handleFileUpload}
        adobeDivId={adobeDivId}
        //@ts-ignore
        viewerRef={viewerRef}
        isSearching={isDirectSearching || isSearchProcessing}
      />
      {isUploadingFiles && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30">
          <Loader />
        </div>
      )}
    </div>
  );
};

export default PdfViewerPage;