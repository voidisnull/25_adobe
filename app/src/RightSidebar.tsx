import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import CircleLoader from "./Loader2";

interface RightPdfViewerProps {
  adobeDivId: string;
  viewerRef: React.RefObject<HTMLDivElement>;
  files: File[];
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isSearching?: boolean;
}

const RightPdfViewer: React.FC<RightPdfViewerProps> = ({
  adobeDivId,
  viewerRef,
  files,
  onFileUpload,
  isSearching,
}) => {
  return (
    <>
      {files.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-1 items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50 min-h-screen"
        >
          <div className="text-center max-w-2xl mx-auto px-8">
            {/* Header Section */}
            <div className="mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Document Intelligence
              </h1>
              <p className="text-lg text-gray-600">
                Transform your documents with AI-powered analysis and insights
              </p>
            </div>

            {/* Upload Area */}
            <div className="mb-12">
              <label
                htmlFor="pdf-upload"
                className="relative block w-full max-w-2xl mx-auto p-16 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-300 group"
              >
                {/* Upload Icon Circle */}
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mb-6 group-hover:bg-blue-700 transition-colors">
                    <Upload className="w-10 h-10 text-white" />
                  </div>

                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Drop your document here
                  </h3>

                  <p className="text-gray-500 mb-6">
                    Select PDF files to begin your intelligent
                    <br />
                    document analysis
                  </p>
                </div>

                <input
                  id="pdf-upload"
                  type="file"
                  accept="application/pdf"
                  multiple
                  className="hidden"
                  onChange={onFileUpload}
                />
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4 flex-wrap">
              <Button
                variant="outline"
                className="px-8 py-3 rounded-full border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200"
                onClick={() => document.getElementById("pdf-upload")?.click()}
              >
                {/* Search icon to match IconSidebar */}
                <svg
                  className="w-4 h-4 mr-2"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                Search
              </Button>

              <Button
                variant="outline"
                className="px-8 py-3 rounded-full border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200"
              >
                {/* Podcast icon to match IconSidebar */}
                <svg
                  className="w-4 h-4 mr-2"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
                Podcast
              </Button>

              <Button
                variant="outline"
                className="px-8 py-3 rounded-full border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200"
              >
                {/* Insights icon to match IconSidebar */}
                <svg
                  className="w-4 h-4 mr-2"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 18h6" />
                  <path d="M10 22h4" />
                  <path d="M12 2a7 7 0 0 0-7 7c0 2.5 1.2 4.7 3 6.1v1.9h8v-1.9c1.8-1.4 3-3.6 3-6.1a7 7 0 0 0-7-7z" />
                  <path d="M9 9c0-1.5 1.3-3 3-3" />
                </svg>
                Insights
              </Button>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative flex-1 h-full w-full"
        >
          <div id={adobeDivId} ref={viewerRef} className="h-full w-full" />
          {isSearching && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/50">
              <CircleLoader />
            </div>
          )}
        </motion.div>
      )}
    </>
  );
};

export default RightPdfViewer;
