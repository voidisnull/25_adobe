import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import type { SelectedContentData } from "./LeftSidebar";

interface FilesPanelProps{
  files: File[];
  selectedFile: File | null;
  isPdfLoading: boolean;
  pdfLoadedFileName: string | null;
  selectedContent: SelectedContentData | null;
  setSelectedFile: (file: File | null) => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isUploading?: boolean;
}

const FilesPanel: React.FC<FilesPanelProps> = ({
  files,
  selectedFile,
  isPdfLoading,
  pdfLoadedFileName,
  selectedContent,
  setSelectedFile,
  onFileUpload,
  isUploading,
}) => {
  // // Handle PDF loading toast
  // useEffect(() => {
  //   if (isPdfLoading && selectedFile) {
  //     toast.loading("Processing PDF...", {
  //       position: "bottom-left",
  //       toastId: "pdf-loading",
  //     });

  //     return () => {
  //       toast.dismiss("pdf-loading");
  //     };
  //   }
  // }, [isPdfLoading, selectedFile]);

  // Handle PDF preview loaded - dismiss toast at this exact step
  useEffect(() => {
    if (pdfLoadedFileName && isPdfLoading) {
      // Dismiss the loading toast when PDF preview is loaded (before full initialization)
      toast.dismiss("pdf-loading");
    }
  }, [pdfLoadedFileName, isPdfLoading]);

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-50 to-white" aria-busy={isUploading ? true : undefined}>
      {/* Header */}
      <div className="p-6 border-b border-blue-100/60">
        <h2 className="text-xl font-medium text-blue-900 mb-2 flex items-center gap-3">
          <div className="w-7 h-7 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          File Management
        </h2>
        <p className="text-sm text-slate-600 font-normal">
          Upload and manage your PDF files
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {files.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <div className="border border-blue-200/60 rounded-2xl p-12 text-center bg-white/80 backdrop-blur-sm shadow-sm">
              <div className="mb-6">
                <div className="w-16 h-16 mx-auto bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-blue-600"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14,2 14,8 20,8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-medium text-blue-900 mb-3">
                No files uploaded yet
              </h3>
              <p className="text-sm text-slate-600 mb-8 max-w-sm mx-auto leading-relaxed">
                Upload your PDF files to get started with AI-powered analysis
              </p>
              <div className="relative group">
                <input
                  type="file"
                  accept="application/pdf"
                  multiple
                  onChange={onFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  disabled={!!isUploading}
                />
                <div className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5">
                  Choose Files
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {/* Upload More Files */}
            <div className="mb-8">
              <div className="relative group">
                <input
                  type="file"
                  accept="application/pdf"
                  multiple
                  onChange={onFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 rounded-xl"
                  disabled={!!isUploading}
                />
                <div className="bg-white hover:bg-blue-50/30 border-2 border-dashed border-blue-200 hover:border-blue-400 rounded-xl p-4 transition-all duration-300 hover:shadow-md group-hover:scale-[1.01]">
                  <div className="flex items-center justify-center gap-3 text-blue-700">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-blue-600"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    <span className="text-sm font-medium">Add More Files</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Files List */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-blue-900 mb-4 flex items-center gap-2">
                <span>Uploaded Files</span>
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-xs font-medium">
                  {files.length}
                </span>
              </div>

              {files.map((file: File) => (
                <motion.div
                  key={file.name}
                  whileHover={{ y: -1 }}
                  transition={{ duration: 0.2 }}
                  className={`group p-5 rounded-xl cursor-pointer transition-all duration-200 border ${
                    selectedFile?.name === file.name
                      ? "bg-blue-50/80 border-blue-300 shadow-md ring-1 ring-blue-200/60 backdrop-blur-sm"
                      : "bg-white/80 border-blue-100/60 hover:bg-blue-50/40 hover:border-blue-200/80 shadow-sm hover:shadow-md backdrop-blur-sm"
                  }`}
                  onClick={() => setSelectedFile(file)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          selectedFile?.name === file.name
                            ? "bg-blue-600"
                            : "bg-blue-50 group-hover:bg-blue-100"
                        } transition-colors duration-200`}
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={
                            selectedFile?.name === file.name
                              ? "text-white"
                              : "text-blue-600"
                          }
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14,2 14,8 20,8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`font-medium text-sm truncate mb-1 ${
                            selectedFile?.name === file.name
                              ? "text-blue-900"
                              : "text-slate-800"
                          }`}
                          title={file.name}
                        >
                          {file.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {(file.size / (1024 * 1024)).toFixed(1)} MB
                        </div>
                      </div>
                    </div>
                    {selectedFile?.name === file.name && (
                      <div className="flex-shrink-0">
                        <span className="text-xs text-blue-700 font-medium bg-blue-100 px-3 py-1.5 rounded-lg">
                          Selected
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Selected Content Display */}
            
          </motion.div>
        )}
      </div>

      {/* Toast container is provided globally in main.tsx */}
    </div>
  );
};

export default FilesPanel;
