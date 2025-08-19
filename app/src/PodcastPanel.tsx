import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Bot } from "lucide-react";
import type {
  ChatMessage,
  SearchResultItem,
  SelectedContentData,
} from "./LeftSidebar";
import { apiClient } from "./api/client";
import Loader from "./Loader2";

interface PodcastPanelProps {
  selectedFile: File | null;
  selectedContent: SelectedContentData | null;
  chatMessages: ChatMessage[];
  searchResults: SearchResultItem[];
  activeResultId: string | null;
  isProcessingQuery: boolean;
  audioUrl?: string;
  onGeneratePodcast: (message: string) => void;
  onResultClick: (result: SearchResultItem) => void;
  onClearChat: () => void;
  sectionsResultsByBotId: Record<string, SearchResultItem[]>;
}

interface PodcastSectionProps {
  userQuery: string;
  botResponse: string;
  searchResults: SearchResultItem[];
  activeResultId: string | null;
  onResultClick: (result: SearchResultItem) => void;
  index: number;
  audioUrl?: string;
  isLatestSection: boolean;
  selectedFile: File | null;
  selectedContent: SelectedContentData | null;
}

const PodcastSection: React.FC<PodcastSectionProps> = ({
  userQuery,
  botResponse,
  searchResults,
  activeResultId,
  onResultClick,
  index,
  audioUrl,
  isLatestSection,
  selectedFile,
  selectedContent,
}) => {
  const [localSelectedResultId, setLocalSelectedResultId] = useState<
    string | null
  >(null);
  const [isTypingSummary, setIsTypingSummary] = useState<boolean>(false);
  const [typedSummaryContent, setTypedSummaryContent] = useState<string>("");
  const summaryRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [podcastData, setPodcastData] = useState<any>(null);
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState<boolean>(false);

  const selectedResultIndex = searchResults.findIndex(
    (result) => result.id === localSelectedResultId
  );
  const selectedResult = selectedResultIndex >= 0 ? selectedResultIndex : null;

  // Generate podcast from selected text
  const generatePodcast = async () => {
    if (!selectedFile || !selectedContent?.data) {
      console.log('No file or text selected for podcast');
      return;
    }

    try {
      setIsGeneratingPodcast(true);
      
      // Extract data for API call
      const fileId = (selectedFile as any).id || (selectedFile as any).file_id;
      const pageNumber = selectedContent.pageNo || 1;
      const selectedText = selectedContent.data.trim();

      console.log('Generating podcast for:', { fileId, pageNumber, selectedText });

      // Call podcast API (immediate response, no polling)
      const podcast = await apiClient.generatePodcast({
        selection_text: selectedText,
        voice: 'default',
      });

      console.log('Podcast data:', podcast);
      
      // Update state with real podcast data
      setPodcastData(podcast);
      
      // Note: Audio will be fetched separately by the parent component
      console.log('Podcast generated with ID:', podcast.id);
      
    } catch (error) {
      console.error('Failed to generate podcast:', error);
    } finally {
      setIsGeneratingPodcast(false);
    }
  };

  
  
  const handleResultClick = (resultIndex: number, result: SearchResultItem) => {
    const isCurrentlySelected = localSelectedResultId === result.id;
    const newActiveId = isCurrentlySelected ? null : result.id;

    setLocalSelectedResultId(newActiveId);
    onResultClick(result);

    let contentToShow: string;
    if (newActiveId === null) {
      contentToShow = mainSummary;
    } else {
      contentToShow = result.annotationToAdd || result.contentToSearch || "";
    }

    if (isLatestSection) {
      startTypingEffect(contentToShow);
    } else {
      setTypedSummaryContent(contentToShow);
      setIsTypingSummary(false);
    }

    setTimeout(() => {
      summaryRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  const startTypingEffect = (content: string) => {
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    setIsTypingSummary(true);
    setTypedSummaryContent("");

    let i = 0;
    typingTimerRef.current = setInterval(() => {
      i += 2;
      setTypedSummaryContent(content.slice(0, i));
      if (i >= content.length) {
        if (typingTimerRef.current) {
          clearInterval(typingTimerRef.current);
          typingTimerRef.current = null;
        }
        setIsTypingSummary(false);
      }
    }, 16);
  };

  const clearSelection = () => {
    setLocalSelectedResultId(null);

    if (isLatestSection) {
      startTypingEffect(mainSummary);
    } else {
      setTypedSummaryContent(mainSummary);
      setIsTypingSummary(false);
    }
  };

  const parseBackendData = () => {
    // Use real podcast data if available, otherwise fall back to botResponse
    if (podcastData?.summary) {
      return podcastData.summary;
    }
    
    try {
      const parsedData = JSON.parse(botResponse);
      if (parsedData.summary) {
        return parsedData.summary;
      }
    } catch (error) {}
    return botResponse;
  };

  const mainSummary = parseBackendData();

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  useEffect(() => {
    setIsExpanded(isLatestSection);

    const contentToShow =
      selectedResult !== null
        ? searchResults[selectedResult]?.annotationToAdd ||
          searchResults[selectedResult]?.contentToSearch ||
          mainSummary
        : mainSummary;

    if (isLatestSection) {
      startTypingEffect(contentToShow);
    } else {
      setTypedSummaryContent(contentToShow);
      setIsTypingSummary(false);
    }

    return () => {
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    };
  }, [mainSummary, index, selectedResult, searchResults, isLatestSection]);

  const getSummaryContent = () => {
    const content = typedSummaryContent;
    if (!isLatestSection && !isExpanded && content.length > 150) {
      return content.slice(0, 150) + "...";
    }
    return content;
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const getSummaryTitle = () => {
    if (selectedResult !== null) {
      return `Detailed Analysis: Segment ${selectedResult + 1}`;
    }
    return "Podcast Response";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="mb-8 space-y-4 px-4"
      data-section-index={index}
    >
      {/* User Query - Chat bubble style on right with reduced padding */}
      <div className="flex justify-end">
        <div className="max-w-[75%]">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="relative"
          >
            <div className="bg-blue-600 text-white p-3 px-7 rounded-2xl rounded-br-md shadow-lg">
              <p className="text-base leading-relaxed break-words">
                {userQuery.length > 100 ? `${userQuery.slice(0, 100)}...` : userQuery}
              </p>
            </div>
            {/* Chat bubble tail */}
            <div className="absolute bottom-0 right-0 w-0 h-0 border-l-[12px] border-l-transparent border-t-[12px] border-t-blue-600"></div>
            
            {/* User avatar */}
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              <User className="w-4 h-4 text-blue-600" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Audio Player Section - Now positioned after user query */}
      {audioUrl && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full"
        >
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-lg max-w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white"
                  >
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    Generated Podcast
                  </h3>
                </div>
              </div>
            </div>

            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={handleAudioEnded}
              className="w-full max-w-full"
              controls
              preload="metadata"
            />

            <div className="mt-3 flex items-center gap-2 text-xs text-blue-600">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              Ready to play your podcast powered by AI
            </div>
          </div>
        </motion.div>
      )}

      {/* Search Results - Top 5 relevant results */}
      {searchResults.length > 0 && (
        <div className="w-full mt-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden max-w-full"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-3 border-b border-blue-200">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-gray-900">
                    Top 5 Relevant Results
                  </h3>
                  <p className="text-xs text-blue-700">
                    Found {Math.min(searchResults.length, 5)} most relevant passage{Math.min(searchResults.length, 5) !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>

            {/* Results List */}
            <div className="p-3 space-y-2">
              {searchResults.slice(0, 5).map((result, resultIndex) => {
                const isSelected = localSelectedResultId === result.id;

                return (
                  <motion.button
                    key={result.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.4,
                      delay: resultIndex * 0.1,
                      ease: "easeOut",
                    }}
                    onClick={() => handleResultClick(resultIndex, result)}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full p-3 rounded-lg border transition-all duration-300 text-left shadow-sm hover:shadow-md max-w-full ${
                      isSelected
                        ? "border-blue-300 bg-gradient-to-r from-blue-50 to-blue-25 shadow-md border-l-4 border-l-blue-500"
                        : "border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/30"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 ${
                            isSelected
                              ? "text-blue-700 bg-blue-100 border border-blue-200"
                              : "text-blue-700 bg-blue-100"
                          }`}
                        >
                          #{resultIndex + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h4
                            className={`text-sm font-bold truncate ${
                              isSelected ? "text-gray-900" : "text-gray-800"
                            }`}
                          >
                            {result.filename || `Result ${resultIndex + 1}`}
                          </h4>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-medium flex-shrink-0 ml-2 ${
                          isSelected ? "text-blue-700" : "text-gray-600"
                        }`}
                      >
                        Page {result.pageNo}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <p
                        className={`text-xs leading-relaxed line-clamp-2 break-words ${
                          isSelected ? "text-gray-700" : "text-gray-600"
                        }`}
                      >
                        {result.contentToSearch}
                      </p>

                      {isSelected && (
                        <div className="pt-2 mt-2 border-t border-blue-200">
                          <div className="flex items-center gap-2 text-xs text-blue-700 font-medium">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                            <span>Selected for analysis</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {selectedResult !== null && (
              <div className="px-3 pb-3 border-t border-gray-100">
                <div className="flex items-center justify-center pt-3">
                  <motion.button
                    onClick={clearSelection}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 bg-white hover:bg-blue-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    Clear Selection
                  </motion.button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* AI Response - Chat bubble style on left with reduced padding */}
      <div className="flex justify-start">
        <div className="max-w-[85%]">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="relative"
          >
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md shadow-lg overflow-hidden">
              {/* AI Response Content */}
              <div className="p-3" ref={summaryRef}>
                <motion.div
                  key={selectedResult !== null ? `selected-${selectedResult}` : "main"}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="prose prose-base max-w-none"
                >
                  <div className="bg-gradient-to-r from-gray-50/80 to-blue-50/50 p-3 rounded-xl border border-gray-100">
                    <p className="text-gray-800 leading-relaxed m-0 text-base font-medium break-words whitespace-pre-wrap overflow-hidden">
                      {getSummaryContent()}
                      {isTypingSummary && isLatestSection && (
                        <span className="animate-pulse text-blue-500 ml-1">|</span>
                      )}
                    </p>
                  </div>
                  {!isLatestSection && typedSummaryContent.length > 150 && (
                    <div className="mt-3 flex justify-center">
                      <motion.button
                        onClick={toggleExpanded}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2 transition-colors"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {isExpanded ? (
                          <>
                            Read Less
                            <svg
                              className="w-4 h-4 transform rotate-180"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </>
                        ) : (
                          <>
                            Read More
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </>
                        )}
                      </motion.button>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>
            
            {/* Chat bubble tail */}
            <div className="absolute bottom-0 left-0 w-0 h-0 border-r-[12px] border-r-transparent border-t-[12px] border-t-white"></div>
            
            {/* AI avatar */}
            <div className="absolute -bottom-2 -left-2 w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              <Bot className="w-4 h-4 text-white" />
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

const PodcastPanel: React.FC<PodcastPanelProps> = ({
  selectedFile,
  selectedContent,
  chatMessages,
  searchResults,
  activeResultId,
  isProcessingQuery,
  audioUrl,
  onGeneratePodcast,
  onResultClick,
  onClearChat,
  sectionsResultsByBotId,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [typedContent, setTypedContent] = useState<string>("");
  const [shouldAutoScroll, setShouldAutoScroll] = useState<boolean>(false);

  useEffect(() => {
    if (chatMessages.length > 0) {
      const lastMessage = chatMessages[chatMessages.length - 1];
      if (lastMessage.type === "bot") {
        setTimeout(() => {
          suggestionsRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 500);
      }
    }
  }, [chatMessages]);

  useEffect(() => {
    if (shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setShouldAutoScroll(false);
    }
  }, [chatMessages, shouldAutoScroll]);

  useEffect(() => {
    if (chatMessages.length === 0) return;
    const last = chatMessages[chatMessages.length - 1];
    if (last.type !== "bot") return;
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

  const handleGeneratePodcast = () => {
    if (selectedContent?.data?.trim()) {
      onGeneratePodcast(selectedContent.data.trim());
      setShouldAutoScroll(false);
    }
  };

  const canGenerate = selectedFile && selectedContent?.data?.trim();

  const getConversationPairs = () => {
    const pairs: Array<{ user: ChatMessage; bot: ChatMessage }> = [];

    if (!chatMessages || chatMessages.length === 0) {
      return pairs;
    }

    for (let i = 0; i < chatMessages.length; i++) {
      if (chatMessages[i].type === "user") {
        const userMessage = chatMessages[i];
        const botMessage = chatMessages[i + 1];

        if (botMessage && botMessage.type === "bot") {
          pairs.push({ user: userMessage, bot: botMessage });
        }
      }
    }

    return pairs;
  };

  const conversationPairs = getConversationPairs();

  return (
    <div
      className="h-full w-full flex flex-col bg-gradient-to-br from-gray-50 via-white to-gray-100 overflow-hidden"
      data-panel="podcast"
    >
      <motion.div
        className="p-6 border-b border-gray-200 bg-white flex-shrink-0"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <h2 className="text-xl font-semibold text-gray-800 mb-2 flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-100 border border-gray-300 rounded-lg flex items-center justify-center">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-600"
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </div>
          AI Podcast Generator
        </h2>
      </motion.div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
        {chatMessages.length === 0 ? (
          <div className="text-center text-gray-600 py-16 px-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="max-w-md mx-auto"
            >
              <div className="w-24 h-24 mx-auto mb-8 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-blue-600"
                >
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </div>

              <motion.h3
                className="text-2xl font-semibold mb-4 text-gray-700"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                AI-Powered Podcast Generator
              </motion.h3>

              <motion.p
                className="text-base text-gray-600 mb-8 leading-relaxed"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                Upload a PDF document and select content to generate an engaging
                podcast with AI narration.
              </motion.p>

              <motion.div
                className="grid grid-cols-2 gap-4 text-left"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              ></motion.div>
            </motion.div>
          </div>
        ) : (
          <div className="py-6 w-full">
            {conversationPairs.map((pair, index) => (
              <div
                key={`${pair.user.id}-${pair.bot.id}`}
                className="py-1 w-full"
                ref={
                  index === conversationPairs.length - 1 ? suggestionsRef : null
                }
              >
                <PodcastSection
                  userQuery={pair.user.content}
                  botResponse={pair.bot.content}
                  searchResults={sectionsResultsByBotId[pair.bot.id] || []}
                  activeResultId={activeResultId}
                  onResultClick={onResultClick}
                  index={index}
                  audioUrl={audioUrl}
                  isLatestSection={index === conversationPairs.length - 1}
                  selectedFile={selectedFile}
                  selectedContent={selectedContent}
                />
              </div>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />

        {isProcessingQuery && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 pointer-events-none">
            <Loader />
          </div>
        )}
      </div>

      <div className="p-6 bg-white border-t border-gray-200 flex-shrink-0 relative z-30">
        <div className="flex gap-4 items-end max-w-full">
          <div className="flex-1 min-w-0">
            {selectedContent?.data ? (
              <div className="relative">
                <div className="w-full px-5 py-3 border border-gray-300 rounded-lg bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all duration-200">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <svg
                        className="w-4 h-4 text-gray-400 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span className="text-sm font-semibold text-gray-700 truncate">
                        Selected Content
                      </span>

                      {selectedContent.pageNo && (
                        <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full flex-shrink-0">
                          Page {selectedContent.pageNo}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-400 font-medium italic flex-shrink-0 ml-2">
                      {selectedContent.data.length} characters
                    </div>
                  </div>
                  <div className="text-gray-700 leading-relaxed text-sm line-clamp-2 break-words overflow-hidden">
                    {selectedContent.data.length > 200
                      ? `${selectedContent.data.substring(0, 200)}...`
                      : selectedContent.data}
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="w-full px-5 py-3 border border-gray-300 rounded-lg bg-gray-50 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <svg
                      className="w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span className="text-sm font-semibold text-gray-700">
                      Selected Content
                    </span>
                  </div>
                  <div className="text-gray-400 text-sm">
                    No content selected from PDF
                  </div>
                </div>
              </div>
            )}
          </div>
          <motion.button
            onClick={handleGeneratePodcast}
            disabled={!canGenerate || isProcessingQuery}
            whileHover={{ scale: canGenerate && !isProcessingQuery ? 1.02 : 1 }}
            whileTap={{ scale: canGenerate && !isProcessingQuery ? 0.98 : 1 }}
            className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:from-blue-200 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center border border-blue-400 flex-shrink-0"
          >
            {isProcessingQuery ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              <svg
                className="w-5 h-5 rotate-90 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </motion.button>
        </div>

        {!canGenerate && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-sm text-gray-600 bg-gray-50 px-5 py-4 rounded-xl border border-gray-200"
          >
            ⚠️ Please select a PDF file and highlight some content to generate a
            podcast
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default PodcastPanel;