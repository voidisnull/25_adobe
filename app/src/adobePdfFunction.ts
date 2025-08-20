// Adobe PDF SDK Types and Functions

const CLIENT_ID = "5da540d215fd4f1a9cd89f97a45bae83";

// Type definitions
export interface SearchResultInfo {
  currentResult: {
    pageNumber: number;
    index: number;
  };
  totalResults: number;
  status: 'IN_PROGRESS' | 'COMPLETED';
}

export interface SearchObject {
  onResultsUpdate: (callback: (result: SearchResultInfo) => void) => Promise<boolean>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  clear: () => Promise<void>;
}

export interface AdobeViewer {
  getAPIs: () => Promise<{
    search: (term: string) => Promise<SearchObject>;
    gotoLocation: (pageNumber: number, x?: number, y?: number) => Promise<void>;
    clearPageSelection: (pageNumber: number) => Promise<void>;
    getSelectedContent: () => Promise<{ type: string; data: string }>;
  }>;
}

// AnnotationManager interface removed - no longer needed

export interface AdobeDCView {
  previewFile: (
    fileConfig: {
      content: { promise: Promise<ArrayBuffer> };
      metaData: { fileName: string; id: string };
    },
    viewerConfig: Record<string, any>
  ) => Promise<AdobeViewer>;
  // getAnnotationManager removed - no longer needed
  registerCallback: (
    type: any,
    handler: (event: any) => void,
    options?: Record<string, any>
  ) => void;
}

export interface SelectedContentData {
  type: string;
  data: string;
  timestamp: number;
}

// Load Adobe SDK script
export const loadAdobeSDK = (): void => {
  const existingScript = document.getElementById("adobe-sdk");
  if (!existingScript) {
    const script = document.createElement("script");
    script.id = "adobe-sdk";
    script.src = "https://acrobatservices.adobe.com/view-sdk/viewer.js";
    script.async = true;
    
    // Add event listener to detect when SDK is loaded
    script.onload = () => {
      console.log("✅ Adobe SDK loaded successfully");
      console.log("🔧 AdobeDC available:", !!(window as any).AdobeDC);
      if ((window as any).AdobeDC) {
        console.log("🔧 AdobeDC.View available:", !!(window as any).AdobeDC.View);
        console.log("🔧 AdobeDC.View version:", (window as any).AdobeDC?.View?.version);
      }
    };
    
    script.onerror = () => {
      console.error("❌ Failed to load Adobe SDK");
    };
    
    document.body.appendChild(script);
  }
};

let currentViewInstance: AdobeDCView | null = null;
let directSearchInProgress = false;

// Wait function removed - no longer needed

// Annotation manager retry function removed - no longer needed

// Load PDF with Adobe Viewer
export const loadPdfWithAdobe = async (
  file: File,
  adobeDivId: string
): Promise<AdobeViewer> => {
  if (!(window as any).AdobeDC) {
    throw new Error("Adobe SDK not loaded");
  }

  // Clear previous viewer DOM
  const viewerDiv = document.getElementById(adobeDivId);
  if (viewerDiv) {
    viewerDiv.innerHTML = '';
  }

  // Add delay to ensure cleanup is complete
  await new Promise(resolve => setTimeout(resolve, 100));

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = function (e: ProgressEvent<FileReader>) {
      if (!e.target?.result) {
        reject(new Error("Failed to read file"));
        return;
      }

      const adobeDCView = new (window as any).AdobeDC.View({
        clientId: CLIENT_ID,
        divId: adobeDivId,
      }) as AdobeDCView;
       currentViewInstance = adobeDCView;
       
       console.log("🔧 AdobeDC.View created:", adobeDCView);
       console.log("🔧 Available methods:", Object.getOwnPropertyNames(adobeDCView));
       console.log("🔧 getAnnotationManager available:", typeof (adobeDCView as any).getAnnotationManager);

      const previewFilePromise = adobeDCView.previewFile(
        {
          content: { promise: Promise.resolve(e.target.result as ArrayBuffer) },
          metaData: { 
            fileName: file.name,
            id: file.name.replace(/[^a-zA-Z0-9]/g, '_') + '_' + Date.now()
          },
        },
        {
          embedMode: "FULL_WINDOW",
          defaultViewMode: "FIT_PAGE",
          showAnnotationTools: true,
          showDownloadPDF: true,
          showPrintPDF: true,
          showZoomControl: true,
          showThumbnails: true,
          showBookmarks: true,
          enableFormFilling: true,
          enableSearchAPIs: true,
          enableTextSelection: true,
          showLeftHandPanel: true,
          showPageControls: true
        }
      );

      previewFilePromise
         .then(async (adobeViewer: AdobeViewer) => {
           console.log("📄 PDF preview loaded, waiting for full initialization...");
           
           // Wait a bit for the PDF to be fully loaded and rendered
           await new Promise(resolve => setTimeout(resolve, 2000));
           
           console.log("🔧 Now attempting to get annotation manager...");
           
           // Annotation manager functionality removed - no longer needed
           
          resolve(adobeViewer);
        })
        .catch((error: Error) => {
          reject(error);
        });
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsArrayBuffer(file);
  });
};

// Setup selection monitoring
export const setupSelectionMonitoring = (
  viewer: AdobeViewer,
  onSelectionChange: (content: SelectedContentData | null) => void,
  isCheckingSelection: { current: boolean }
): ReturnType<typeof setInterval> => {
  const selectionInterval = setInterval(async () => {
    if (isCheckingSelection.current) return;

    try {
      isCheckingSelection.current = true;
      const apis = await viewer.getAPIs();
      const result = await apis.getSelectedContent();

      if (result?.data?.trim()) {
        onSelectionChange({
          type: result.type,
          data: result.data,
          timestamp: Date.now()
        });
      } else {
        onSelectionChange(null);
      }
    } catch {
      onSelectionChange(null);
    } finally {
      isCheckingSelection.current = false;
    }
  }, 500);

  return selectionInterval;
};


// Clear PDF selection helper
export const clearPdfSelection = async (viewer: AdobeViewer): Promise<void> => {
  try {
    const apis = await viewer.getAPIs();
    // Try to clear selection on all pages (we don't know which page has selection)
    for (let i = 1; i <= 50; i++) { // Check up to 50 pages
      try {
        await apis.clearPageSelection(i);
      } catch (e) {
        // Ignore errors for pages that don't exist or have no selection
      }
    }
    console.log("🧹 PDF selection cleared");
  } catch (error) {
    console.log("Could not clear PDF selection:", error);
  }
};

// Regular search function
export const performRegularSearch = async (
  viewer: AdobeViewer,
  searchTerm: string,
  onSearchResult: (result: SearchResultInfo) => void
): Promise<SearchObject> => {
  const apis = await viewer.getAPIs();
  const searchResult = await apis.search(searchTerm);
  
  const callbackFunction = async (searchResultInfo: SearchResultInfo): Promise<void> => {
    console.log("Regular search result: ", searchResultInfo);
    onSearchResult(searchResultInfo);
    // No PDF annotations. The embed API's search already highlights matches.
  };
  
  await searchResult.onResultsUpdate(callbackFunction);
  return searchResult;
};

// Direct search with navigation
export const performDirectSearch = async (
  viewer: AdobeViewer,
  pageNumber: number,
  searchContent: string,
  customComment: string,
  onSearchResult: (result: SearchResultInfo) => void,
  onSearchComplete: (success: boolean, message: string) => void
): Promise<SearchObject | null> => {
  if (directSearchInProgress) {
    onSearchComplete(false, `❌ Search already in progress`);
    return null;
  }
  directSearchInProgress = true;
  try {
    console.log(`🔍 Starting direct search for "${searchContent}" on page ${pageNumber}`);
    
    const apis = await viewer.getAPIs();
    
    // Navigate to specific page first
    console.log(`📄 Navigating to page ${pageNumber}`);
    await apis.gotoLocation(pageNumber, 0, 0);
    
    // Wait for page to load and render
    console.log("⏳ Waiting for page to load...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Clear any existing search highlights
    try {
      await apis.clearPageSelection(pageNumber);
      console.log("🧹 Cleared existing selections");
    } catch (e) {
      console.log("No existing selection to clear");
    }
    
    // Search for the content
    console.log(`🔍 Searching for: "${searchContent}"`);
    const searchResult = await apis.search(searchContent);
    console.log("✅ Search initiated");
    
    let searchCompleted = false;
    let hops = 0;
    const maxHops = 100; // tighter cap to avoid loops

    const callbackFunction = async (searchResultInfo: SearchResultInfo): Promise<void> => {
      if (searchCompleted) return;

      // No matches anywhere
      if (searchResultInfo.status === 'COMPLETED' && searchResultInfo.totalResults === 0) {
        searchCompleted = true;
        try { await searchResult.clear(); } catch {}
        onSearchComplete(false, `❌ NOT FOUND ON PAGE ${pageNumber}\n\nContent: "${searchContent}"`);
        return;
      }

      if (!searchResultInfo.currentResult || searchResultInfo.totalResults <= 0) {
        return;
      }

      const currentPage = searchResultInfo.currentResult.pageNumber;

      // Keep advancing until we land on the requested page
      if (currentPage !== pageNumber) {
        // Immediately clear any highlight on wrong page
        try { await apis.clearPageSelection(currentPage); } catch {}
        if (searchResultInfo.status === 'COMPLETED' || hops >= maxHops) {
          searchCompleted = true;
          try { await searchResult.clear(); } catch {}
          onSearchComplete(false, `❌ NOT FOUND ON PAGE ${pageNumber}\n\nContent: "${searchContent}"`);
          return;
        }
        hops += 1;
        try {
          await searchResult.next();
        } catch {}
        return;
      }

      // Found on requested page
      searchCompleted = true;
      try { await searchResult.clear(); } catch {}
      onSearchComplete(true, `✅ SUCCESS!\n\nFound: "${searchContent}"\nPage: ${searchResultInfo.currentResult.pageNumber}\nResult: ${searchResultInfo.currentResult.index + 1} of ${searchResultInfo.totalResults}`);
    };

    await searchResult.onResultsUpdate(callbackFunction);
    console.log("🎯 Search initiated successfully (page-restricted)");
    
    return searchResult;
  } catch (error) {
    console.error("❌ Direct search error:", error);
    onSearchComplete(false, `❌ Search Failed\n\nError: ${error}\n\nPlease check:\n✓ PDF is fully loaded\n✓ Page number exists\n✓ Search content spelling`);
    return null;
  } finally {
    directSearchInProgress = false;
  }
};

// Annotation functionality removed - no longer needed

// Navigation functions for search results
export const navigateSearchResults = {
  next: async (searchObject: SearchObject): Promise<void> => {
    try {
      await searchObject.next();
    } catch (error) {
      console.error("Next result error:", error);
      throw error;
    }
  },

  previous: async (searchObject: SearchObject): Promise<void> => {
    try {
      await searchObject.previous();
    } catch (error) {
      console.error("Previous result error:", error);
      throw error;
    }
  },

  clear: async (searchObject: SearchObject): Promise<void> => {
    try {
      await searchObject.clear();
    } catch (error) {
      console.error("Clear search error:", error);
      throw error;
    }
  }
};