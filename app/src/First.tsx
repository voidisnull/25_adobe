"use client"

import { useState } from "react"
import { ArrowRight, Headphones, Search, Lightbulb } from "lucide-react"
import { useNavigate } from "react-router-dom"
const HeroSection = () => {
  const [isHovered, setIsHovered] = useState(false)
  const navigate = useNavigate()
  const handleGetStarted = () => {
    navigate("/main")
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-blue-50 relative overflow-x-hidden overflow-y-auto">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse delay-1000"></div>

      <div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8 sm:py-10 lg:py-12">

        <div className="text-center mb-8 sm:mb-10">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/80 backdrop-blur-sm border border-blue-200/50 rounded-full shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-extrabold">A</span>
            </div>
            <span className="text-blue-700 font-semibold text-sm tracking-wide">Adobe India Hackathon 2025</span>
          </div>

          {/* removed certification badges */}
        </div>
          

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight tracking-tight">
            From Brains to{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Experience
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto font-light mb-8">
            Revolutionary AI-powered document intelligence that connects ideas across your entire library,
            <span className="text-gray-800 font-medium"> surfacing hidden insights</span> and transforming information
            into immersive experiences.
          </p>

          {/* removed partner badges */}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full text-blue-700 text-sm font-medium">
            <Headphones className="w-4 h-4" />
            Podcasts
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full text-blue-700 text-sm font-medium">
            <Lightbulb className="w-4 h-4" />
            Insights generation
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full text-blue-700 text-sm font-medium">
            <Search className="w-4 h-4" />
            Smart Search
          </div>
        </div>
        {/* removed four feature sections */}

        <div className="text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <button
              onClick={handleGetStarted}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg font-semibold text-sm sm:text-base shadow-md transition-colors flex items-center gap-2"
            >
              <span>Get Started</span>
              <ArrowRight className={`w-4 h-4 transition-transform duration-200 ${isHovered ? "translate-x-1" : ""}`} />
            </button>
          </div>

          {/* helper text removed to minimize height */}
        </div>
      </div>
    </div>
  )
}

export default HeroSection
