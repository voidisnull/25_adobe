import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Upload, 
  Bot, 
  Search, 
  Mic, 
  Lightbulb, 
  Send, 
  RotateCcw, 
  Check, 
  Loader2,
  Play,
  Volume2,
  Clock,
  User
} from "lucide-react";

// Type definitions for props
export interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: number;
}

export interface SearchResultItem {
  id: string;
  filename: string;
  fileId?: string;
  pageNo: number;
  contentToSearch: string;
  annotationToAdd: string;
  isActive?: boolean;
}

export interface SelectedContentData {
  type: string;
  data: string;
  timestamp: number;
  pageNo?: number;
}

type AiMode = 'search' | 'podcast' | 'insights';

interface LeftSidebarProps {
  files: File[];
  selectedFile: File | null;
  isPdfLoading: boolean;
  pdfLoadedFileName: string | null;
  selectedContent: SelectedContentData | null;
  chatMessages: ChatMessage[];
  searchResults: SearchResultItem[];
  activeResultId: string | null;
  isProcessingQuery: boolean;
  aiMode: AiMode;
  audioUrl?: string;
  setSelectedFile: (file: File | null) => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSendMessage: (message: string) => void;
  onResultClick: (result: SearchResultItem) => void;
  onClearChat: () => void;
  onChangeMode: (mode: 'search' | 'podcast' | 'insights') => void;
  onGeneratePodcast: (message: string) => void;
  onGenerateInsights: (message: string) => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  files,
  selectedFile,
  isPdfLoading,
  pdfLoadedFileName,
  selectedContent,
  chatMessages,
  searchResults,
  activeResultId,
  isProcessingQuery,
  aiMode,
  audioUrl,
  setSelectedFile,
  onFileUpload,
  onSendMessage,
  onResultClick,
  onClearChat,
  onChangeMode,
  onGeneratePodcast,
  onGenerateInsights,
}) => {
  const [messageInput, setMessageInput] = useState<string>("");
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [typedContent, setTypedContent] = useState<string>("");

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Typing effect for the latest bot message
  useEffect(() => {
    if (chatMessages.length === 0) return;
    const last = chatMessages[chatMessages.length - 1];
    if (last.type !== 'bot') return;
    if (typingMessageId === last.id) return;

    setTypingMessageId(last.id);
    setTypedContent("");

    let i = 0;
    const full = last.content;
    const timer = setInterval(() => {
      i += 2;
      setTypedContent(full.slice(0, i));
      if (i >= full.length) {
        clearInterval(timer);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [chatMessages]);

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      switch (aiMode) {
        case 'search':
          onSendMessage(messageInput.trim());
          break;
        case 'podcast':
          onGeneratePodcast(messageInput.trim());
          break;
        case 'insights':
          onGenerateInsights(messageInput.trim());
          break;
        default:
          onSendMessage(messageInput.trim());
      }
      setMessageInput("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getModeConfig = () => {
    switch (aiMode) {
      case 'search':
        return {
          icon: Search,
          name: 'Search',
          description: 'Find information in your documents',
          placeholder: 'Ask about your documents...',
          color: 'blue'
        };
      case 'podcast':
        return {
          icon: Mic,
          name: 'Podcast',
          description: 'Generate audio content',
          placeholder: 'Generate podcast about...',
          color: 'purple'
        };
      case 'insights':
        return {
          icon: Lightbulb,
          name: 'Insights',
          description: 'Extract key insights',
          placeholder: 'Get insights from...',
          color: 'orange'
        };
      default:
        return {
          icon: Search,
          name: 'Search',
          description: 'Find information in your documents',
          placeholder: 'Ask about your documents...',
          color: 'blue'
        };
    }
  };

  const modeConfig = getModeConfig();

  const sidebarVariants = {
    expanded: { 
      width: 384,
      transition: { duration: 0.3, ease: "easeInOut" }
    },
    collapsed: { 
      width: 64,
      transition: { duration: 0.3, ease: "easeInOut" }
    }
  };

  const contentVariants = {
    expanded: { 
      opacity: 1,
      transition: { duration: 0.2, delay: 0.1 }
    },
    collapsed: { 
      opacity: 0,
      transition: { duration: 0.2 }
    }
  };

  return (
    <motion.div 
      // variants={sidebarVariants}
      animate={isCollapsed ? "collapsed" : "expanded"}
      className="bg-white border-r border-slate-200 shadow-lg flex flex-col h-full relative"
    >
      {/* Collapse/Expand Button */}
      <motion.button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 z-10 bg-white border border-slate-200 rounded-full p-1.5 shadow-md hover:shadow-lg transition-shadow"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-slate-600" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-slate-600" />
        )}
      </motion.button>

      {/* Collapsed State - Icon Bar */}
      {isCollapsed && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center py-6 space-y-4"
        >
          <div className="p-2 bg-blue-50 rounded-lg">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div className="p-2 bg-slate-50 rounded-lg">
            <Bot className="w-6 h-6 text-slate-600" />
          </div>
          {chatMessages.length > 0 && (
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          )}
        </motion.div>
      )}

      {/* Expanded State - Full Content */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            variants={contentVariants}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            className="flex flex-col h-full"
          >
            {/* SECTION 1: UPLOADED FILES */}
            <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-800">Documents</h2>
                </div>
                
                {files.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors"
                  >
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                    <p className="text-sm text-slate-600 mb-4">Upload your PDF documents</p>
                    <input
                      type="file"
                      accept="application/pdf"
                      multiple
                      onChange={onFileUpload}
                      className="block w-full text-sm text-slate-600 
                        file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 
                        file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 
                        hover:file:bg-blue-100 cursor-pointer"
                    />
                  </motion.div>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm text-slate-600 font-medium">
                        {files.length} document{files.length > 1 ? 's' : ''}
                      </span>
                      <input
                        type="file"
                        accept="application/pdf"
                        multiple
                        onChange={onFileUpload}
                        className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-md 
                          file:border-0 file:text-xs file:bg-slate-100 file:text-slate-700 
                          hover:file:bg-slate-200 cursor-pointer"
                      />
                    </div>
                    
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {files.map((file: File) => (
                        <motion.div
                          key={file.name}
                          whileHover={{ scale: 1.02 }}
                          className={`group flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all ${
                            selectedFile?.name === file.name 
                              ? 'bg-blue-50 border-2 border-blue-200 shadow-sm' 
                              : 'bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                          }`}
                          onClick={() => setSelectedFile(file)}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`p-2 rounded-lg ${
                              selectedFile?.name === file.name ? 'bg-blue-100' : 'bg-slate-100'
                            }`}>
                              <FileText className={`w-4 h-4 ${
                                selectedFile?.name === file.name ? 'text-blue-600' : 'text-slate-600'
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`font-medium text-sm truncate ${
                                  selectedFile?.name === file.name ? 'text-blue-800' : 'text-slate-800'
                                }`} title={file.name}>
                                  {file.name}
                                </span>
                                {selectedFile?.name === file.name && (
                                  <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                )}
                              </div>
                              <div className="text-xs text-slate-500">
                                {(file.size / (1024 * 1024)).toFixed(1)} MB
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Selected Content */}
                    {selectedContent && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-4 p-4 bg-white rounded-xl border border-slate-200"
                      >
                        <div className="text-sm font-medium text-slate-800 mb-3 flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          Selected Text
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3 mb-3">
                          <div className="text-xs text-slate-700 max-h-16 overflow-y-auto">
                            "{selectedContent.data.substring(0, 150)}..."
                          </div>
                          <div className="text-xs text-slate-500 mt-2 flex justify-between">
                            <span>{selectedContent.data.length} characters</span>
                            {selectedContent.pageNo && (
                              <span>Page {selectedContent.pageNo}</span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* Status indicators */}
                <AnimatePresence>
                  {isPdfLoading && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mt-4 bg-blue-50 p-4 rounded-xl border border-blue-200"
                    >
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                        <div>
                          <div className="font-medium text-blue-800 text-sm">Processing Document</div>
                          <div className="text-blue-600 text-xs">
                            Loading {selectedFile?.name}...
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {pdfLoadedFileName && !isPdfLoading && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mt-4 bg-green-50 p-4 rounded-xl border border-green-200"
                    >
                      <div className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-green-600" />
                        <div>
                          <div className="font-medium text-green-800 text-sm">Document Ready</div>
                          <div className="text-green-600 text-xs">
                            {pdfLoadedFileName} loaded successfully
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* SECTION 2: AI ASSISTANT */}
            <div className="flex-1 flex flex-col bg-gradient-to-b from-white to-slate-50">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <Bot className="w-5 h-5 text-slate-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-800">AI Assistant</h2>
                </div>
                
                {/* Mode Selector */}
                <div className="grid grid-cols-1 gap-3 mb-6">
                  <button
                    onClick={() => onChangeMode('search')}
                    className={`group p-4 rounded-xl border-2 transition-all text-left ${
                      aiMode === 'search'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Search className={`w-5 h-5 ${
                        aiMode === 'search' ? 'text-blue-600' : 'text-slate-600'
                      }`} />
                      <div>
                        <div className={`font-medium text-sm ${
                          aiMode === 'search' ? 'text-blue-800' : 'text-slate-800'
                        }`}>
                          Search Mode
                        </div>
                        <div className="text-xs text-slate-600">Find information in documents</div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => onChangeMode('podcast')}
                    className={`group p-4 rounded-xl border-2 transition-all text-left ${
                      aiMode === 'podcast'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Mic className={`w-5 h-5 ${
                        aiMode === 'podcast' ? 'text-purple-600' : 'text-slate-600'
                      }`} />
                      <div>
                        <div className={`font-medium text-sm ${
                          aiMode === 'podcast' ? 'text-purple-800' : 'text-slate-800'
                        }`}>
                          Podcast Mode
                        </div>
                        <div className="text-xs text-slate-600">Generate audio content</div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => onChangeMode('insights')}
                    className={`group p-4 rounded-xl border-2 transition-all text-left ${
                      aiMode === 'insights'
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-slate-200 bg-white hover:border-orange-300 hover:bg-orange-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Lightbulb className={`w-5 h-5 ${
                        aiMode === 'insights' ? 'text-orange-600' : 'text-slate-600'
                      }`} />
                      <div>
                        <div className={`font-medium text-sm ${
                          aiMode === 'insights' ? 'text-orange-800' : 'text-slate-800'
                        }`}>
                          Insights Mode
                        </div>
                        <div className="text-xs text-slate-600">Extract key insights</div>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Current Mode Info */}
                <div className={`p-4 rounded-xl border ${
                  aiMode === 'search' ? 'bg-blue-50 border-blue-200' :
                  aiMode === 'podcast' ? 'bg-purple-50 border-purple-200' :
                  'bg-orange-50 border-orange-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <modeConfig.icon className={`w-5 h-5 ${
                      aiMode === 'search' ? 'text-blue-600' :
                      aiMode === 'podcast' ? 'text-purple-600' :
                      'text-orange-600'
                    }`} />
                    <div>
                      <div className={`font-medium text-sm ${
                        aiMode === 'search' ? 'text-blue-800' :
                        aiMode === 'podcast' ? 'text-purple-800' :
                        'text-orange-800'
                      }`}>
                        {modeConfig.name} Mode Active
                      </div>
                      <div className="text-xs text-slate-600">
                        {modeConfig.description}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {chatMessages.length === 0 ? (
                  <div className="text-center text-slate-500 py-12">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <div className={`p-4 rounded-full mx-auto w-fit ${
                        aiMode === 'search' ? 'bg-blue-100' :
                        aiMode === 'podcast' ? 'bg-purple-100' :
                        'bg-orange-100'
                      }`}>
                        <modeConfig.icon className={`w-8 h-8 ${
                          aiMode === 'search' ? 'text-blue-600' :
                          aiMode === 'podcast' ? 'text-purple-600' :
                          'text-orange-600'
                        }`} />
                      </div>
                      <div className="text-sm font-medium text-slate-700">{modeConfig.name} Mode Ready</div>
                      <div className="text-xs text-slate-500 max-w-xs mx-auto">
                        {modeConfig.description}
                      </div>
                    </motion.div>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {chatMessages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl overflow-hidden ${
                            message.type === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-slate-200 text-slate-800 shadow-sm'
                          }`}
                        >
                          <div className="p-4">
                            <div className="text-sm whitespace-pre-wrap leading-relaxed">
                              {typingMessageId === message.id && message.type === 'bot' ? (
                                <>
                                  {typedContent}
                                  {typedContent.length < message.content.length && (
                                    <motion.span
                                      animate={{ opacity: [1, 0] }}
                                      transition={{ duration: 0.8, repeat: Infinity }}
                                      className="inline-block w-2 h-4 bg-slate-400 ml-1"
                                    />
                                  )}
                                </>
                              ) : (
                                message.content
                              )}
                            </div>
                          </div>
                          <div className={`px-4 pb-3 flex items-center gap-2 text-xs ${
                            message.type === 'user' ? 'text-blue-100' : 'text-slate-500'
                          }`}>
                            {message.type === 'user' ? (
                              <User className="w-3 h-3" />
                            ) : (
                              <Bot className="w-3 h-3" />
                            )}
                            <Clock className="w-3 h-3" />
                            <span>
                              {new Date(message.timestamp).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
                
                {isProcessingQuery && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                        <span className="text-sm text-slate-600">Processing in {modeConfig.name} mode...</span>
                      </div>
                    </div>
                  </motion.div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Audio Player */}
              <AnimatePresence>
                {audioUrl && aiMode === 'podcast' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-6 bg-purple-50 border-t border-purple-200"
                  >
                    <div className="text-sm font-medium text-purple-800 mb-3 flex items-center gap-2">
                      <Volume2 className="w-4 h-4" />
                      Generated Podcast
                    </div>
                    <audio src={audioUrl} controls className="w-full rounded-lg" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Search Results */}
              <AnimatePresence>
                {searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-6 bg-slate-50 border-t border-slate-200 max-h-64 overflow-hidden flex flex-col"
                  >
                    <div className="text-sm font-medium text-slate-800 mb-4 flex items-center gap-2">
                      <Search className="w-4 h-4 text-slate-600" />
                      Search Results ({searchResults.length})
                    </div>
                    
                    <div className="space-y-3 overflow-y-auto flex-1">
                      {searchResults.map((result) => (
                        <motion.button
                          key={result.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => onResultClick(result)}
                          className={`w-full p-4 text-left rounded-xl border transition-all ${
                            result.isActive || activeResultId === result.id
                              ? 'bg-blue-50 border-blue-300 shadow-sm'
                              : 'bg-white hover:bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <FileText className="w-4 h-4 text-slate-600" />
                            <div className="text-xs font-medium text-slate-800 flex items-center gap-2">
                              {result.filename} • Page {result.pageNo}
                              {(result.isActive || activeResultId === result.id) && (
                                <Check className="w-4 h-4 text-blue-600" />
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-slate-600 line-clamp-2">
                            "{result.contentToSearch}"
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Chat Input */}
              <div className="p-6 bg-white border-t border-slate-200">
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <textarea
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={modeConfig.placeholder}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm resize-none transition-all placeholder:text-slate-400"
                      rows={2}
                      disabled={isProcessingQuery}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim() || isProcessingQuery}
                      className={`px-6 py-3 rounded-xl text-white font-medium text-sm transition-all shadow-sm ${
                        aiMode === 'search' ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400' :
                        aiMode === 'podcast' ? 'bg-purple-600 hover:bg-purple-700 disabled:bg-slate-400' :
                        'bg-orange-600 hover:bg-orange-700 disabled:bg-slate-400'
                      } disabled:cursor-not-allowed`}
                    >
                      {isProcessingQuery ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onClearChat}
                      className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Clear
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default LeftSidebar;