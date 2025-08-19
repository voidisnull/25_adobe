import React from "react";
import { motion } from "framer-motion";
export type SidebarMode = 'files' | 'search' | 'podcast' | 'insights';

interface IconSidebarProps {
  activeMode: SidebarMode;
  onModeChange: (mode: SidebarMode) => void;
  onAddFiles: () => void;
}

const IconSidebar: React.FC<IconSidebarProps> = ({
  activeMode,
  onModeChange,
  onAddFiles,
}) => {
  const menuItems = [
    {
      id: 'files' as SidebarMode,
      icon: (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14,2 14,8 20,8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
      name: 'Files',
      description: 'Document Management'
    },
    {
      id: 'search' as SidebarMode,
      icon: (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      ),
      name: 'Search',
      description: 'Content Discovery'
    },
    {
      id: 'podcast' as SidebarMode,
      icon: (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      ),
      name: 'Podcast',
      description: 'Audio Intelligence'
    },
    {
      id: 'insights' as SidebarMode,
      icon: (
<svg
  width="22"
  height="22"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="1.5"
  strokeLinecap="round"
  strokeLinejoin="round"
>
  <path d="M9 18h6" />
  <path d="M10 22h4" />
  <path d="M12 2a7 7 0 0 0-7 7c0 2.5 1.2 4.7 3 6.1v1.9h8v-1.9c1.8-1.4 3-3.6 3-6.1a7 7 0 0 0-7-7z" />
  <path d="M9 9c0-1.5 1.3-3 3-3" />
</svg>

      ),
      name: 'Insights',
      description: 'Smart Analytics'
    }
  ];

  return (
    <motion.div
      className="w-20 bg-gradient-to-b from-white/98 via-white/96 to-white/98 backdrop-blur-xl border-r border-gray-200/60 flex flex-col h-full relative overflow-hidden"
      initial={{ x: -80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{
        boxShadow: "0 0 0 1px rgba(0,0,0,0.03), 0 2px 8px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.06)"
      }}
    >
      {/* Premium Brand Section */}
      <motion.div
        className="p-4 border-b border-gray-100/70 bg-gradient-to-br from-white/95 via-gray-50/40 to-white/95 relative backdrop-blur-sm"
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.div
          className="w-11 h-11 mx-auto bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl flex items-center justify-center relative"
          style={{
            boxShadow: "0 6px 20px rgba(59, 130, 246, 0.25), 0 3px 8px rgba(59, 130, 246, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)"
          }}
          whileHover={{
            scale: 1.08,
            rotate: 2,
            boxShadow: "0 8px 25px rgba(59, 130, 246, 0.35), 0 4px 12px rgba(59, 130, 246, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)"
          }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14,2 14,8 20,8" fill="white" />
            <circle cx="10" cy="14" r="1" fill="white" />
            <circle cx="14" cy="14" r="1" fill="white" />
            <circle cx="10" cy="18" r="1" fill="white" />
          </svg>
          {/* Luxury inner glow */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-white/20 via-white/5 to-white/30"></div>
          {/* Subtle outer ring */}
          <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-br from-blue-400/20 to-blue-800/20 -z-10"></div>
        </motion.div>
      </motion.div>

      {/* Premium Navigation */}
      <div className="flex-1 flex flex-col gap-1 p-3 pt-8">
        {menuItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{
              delay: 0.2 + index * 0.08,
              duration: 0.5,
              ease: [0.16, 1, 0.3, 1]
            }}
          >
            <motion.button
              onClick={() => onModeChange(item.id)}
              className={`relative w-full flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-400 group overflow-hidden ${
                activeMode === item.id
                  ? "bg-gradient-to-b from-blue-50/80 via-blue-50/60 to-blue-50/80 text-blue-700 shadow-lg shadow-blue-100/50"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gradient-to-b hover:from-gray-50/80 hover:via-gray-50/60 hover:to-gray-50/80 hover:shadow-md hover:shadow-gray-100/40"
              }`}
              whileHover={{
                scale: 1.02,
                y: -1,
                transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
              }}
              whileTap={{
                scale: 0.98,
                transition: { duration: 0.15, ease: [0.16, 1, 0.3, 1] }
              }}
            >
              {/* Luxury Icon Container */}
              <motion.div
                className={`p-2 rounded-xl transition-all duration-400 relative ${
                  activeMode === item.id
                    ? "bg-gradient-to-br from-blue-100/80 to-blue-200/60 shadow-sm"
                    : "group-hover:bg-gradient-to-br group-hover:from-gray-100/80 group-hover:to-gray-200/60 group-hover:shadow-sm"
                }`}
                whileHover={{
                  rotate: activeMode === item.id ? 0 : 5,
                  transition: { duration: 0.3 }
                }}
              >
                {item.icon}
                {/* Icon inner glow */}
                <div className={`absolute inset-0 rounded-xl transition-all duration-400 ${
                  activeMode === item.id 
                    ? "bg-gradient-to-t from-blue-200/30 to-white/20" 
                    : "group-hover:bg-gradient-to-t group-hover:from-gray-200/30 group-hover:to-white/20"
                }`}></div>
              </motion.div>

              {/* Premium Label */}
              <span
                className={`text-xs font-semibold text-center leading-tight tracking-wide ${
                  activeMode === item.id
                    ? "text-blue-700"
                    : "text-gray-600 group-hover:text-gray-800"
                }`}
              >
                {item.name}
              </span>

              {/* Bottom Active Indicator - Luxury Line */}
              {activeMode === item.id && (
                <motion.div
                  className="absolute bottom-0 left-1/2 transform -translate-x-1/2"
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  exit={{ scaleX: 0, opacity: 0 }}
                  transition={{
                    duration: 0.8,
                    ease: [0.16, 1, 0.3, 1]
                  }}
                >
                  <div className="w-8 h-1 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 rounded-full shadow-lg shadow-blue-500/50"></div>
                  {/* Glow effect */}
                  <div className="absolute inset-0 w-8 h-1 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-400 rounded-full blur-sm opacity-60"></div>
                </motion.div>
              )}

              {/* Luxury Hover Effects */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-gray-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-400"
                initial={false}
              />

              {/* Active state luxury glow */}
              {activeMode === item.id && (
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/5 via-transparent to-blue-600/10 pointer-events-none"></div>
              )}

              {/* Premium border highlight */}
              <div className={`absolute inset-0 rounded-2xl border transition-all duration-400 ${
                activeMode === item.id
                  ? "border-blue-200/60"
                  : "border-transparent group-hover:border-gray-200/60"
              }`}></div>
            </motion.button>
          </motion.div>
        ))}
      </div>

      {/* Luxury Add Files Button */}
      <motion.div
        className="p-3"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.55, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.button
          onClick={onAddFiles}
          className="w-full h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 hover:from-blue-520 hover:via-blue-620 hover:to-blue-720 text-white flex items-center justify-center transition-all duration-400 cursor-pointer group relative overflow-hidden"
          style={{
            boxShadow: "0 6px 20px rgba(59, 130, 246, 0.3), 0 3px 8px rgba(59, 130, 246, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)"
          }}
          whileHover={{
            scale: 1.03,
            y: -2,
            boxShadow: "0 8px 25px rgba(59, 130, 246, 0.4), 0 4px 12px rgba(59, 130, 246, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.3)",
            transition: { type: "spring", stiffness: 400, damping: 25 }
          }}
          whileTap={{
            scale: 0.97,
            transition: { type: "spring", stiffness: 400, damping: 25 }
          }}
          title="Add More Files"
        >
          {/* Luxury button background effects */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-t from-white/0 via-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-all duration-400"
          />
          
          {/* Plus icon with subtle styling */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="relative z-10"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>

          {/* Button border highlight */}
          <div className="absolute inset-0 rounded-2xl border border-white/20 group-hover:border-white/30 transition-all duration-400"></div>
        </motion.button>
      </motion.div>

      {/* Premium Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Luxury texture overlay */}
        <div className="absolute inset-0 opacity-[0.02] bg-gradient-to-br from-blue-500/20 via-transparent to-purple-500/10"></div>

        {/* Multiple highlight layers */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent"></div>
        <div className="absolute top-1 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-200/30 to-transparent"></div>

        {/* Side luxury highlights */}
        <div className="absolute top-0 bottom-0 right-0 w-px bg-gradient-to-b from-transparent via-white/40 to-transparent"></div>
        <div className="absolute top-0 bottom-0 right-1 w-px bg-gradient-to-b from-transparent via-blue-100/20 to-transparent"></div>

        {/* Subtle radial gradient */}
        <div className="absolute inset-0 bg-radial-gradient from-blue-500/[0.01] via-transparent to-transparent"></div>
      </div>
    </motion.div>
  );
};

export default IconSidebar;