import React, { useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { TopicSummary, BackgroundVideo, CaptionOptions, CaptionFont, CaptionSize, CaptionPosition } from "./types"
import ProgressBar from "@/components/ui/ProgressBar"

interface TopicsPageProps {
  topicSummaries: TopicSummary[]
  selectedTopics: Set<number>
  handleTopicToggle: (topicIndex: number) => void
  continueToCustomise: () => void
  isProcessing: boolean
  backgroundVideo: BackgroundVideo
  captionOptions: CaptionOptions
}

export default function TopicsPage({
  topicSummaries,
  selectedTopics,
  handleTopicToggle,
  continueToCustomise,
  isProcessing,
  backgroundVideo,
  captionOptions
}: TopicsPageProps) {
  const minecraftVideoRef = useRef<HTMLVideoElement>(null)
  const subwayVideoRef = useRef<HTMLVideoElement>(null)
  const megaRampVideoRef = useRef<HTMLVideoElement>(null)

  // Preload videos when component mounts
  useEffect(() => {
    const preloadVideos = () => {
      if (minecraftVideoRef.current) {
        minecraftVideoRef.current.load()
      }
      if (subwayVideoRef.current) {
        subwayVideoRef.current.load()
      }
      if (megaRampVideoRef.current) {
        megaRampVideoRef.current.load()
      }
    }
    preloadVideos()
  }, [])

  // Helper function to get font size in pixels
  const getFontSize = (size: CaptionSize) => {
    switch (size) {
      case 'small': return '22px'
      case 'medium': return '28px'
      case 'large': return '34px'
      default: return '32px'
    }
  }

  // Helper function to get position styling
  const getPositionStyle = (position: CaptionPosition) => {
    switch (position) {
      case 'top': return { top: '25%', transform: 'translateX(-50%)' }
      case 'middle': return { top: '50%', transform: 'translate(-50%, -50%)' }
      case 'bottom': return { bottom: '25%', transform: 'translateX(-50%)' }
      default: return { bottom: '10%', transform: 'translateX(-50%)' }
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
      {/* Left Column */}
      <div className="pl-16 flex flex-col justify-between min-h-[540px] h-[540px]">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Select topics</h3>
          {/* Scrollable topics list that takes remaining space */}
          <div className="space-y-2 overflow-y-auto flex-1" style={{ maxHeight: 'calc(540px - 120px)' }}>
            {topicSummaries.map((summary, index) => (
              <div
                key={index}
                onClick={() => handleTopicToggle(summary.topicIndex)}
                className={`px-6 py-4 rounded-full border cursor-pointer transition-all duration-200 ${
                  selectedTopics.has(summary.topicIndex)
                    ? 'border-pink-500 bg-pink-50 border-[1.5px]'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                style={{ minHeight: '56px' }}
              >
                <span className="font-medium text-md">{summary.topicTitle}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Button aligned with bottom of phone screen */}
        <Button
          onClick={continueToCustomise}
          disabled={selectedTopics.size === 0 || isProcessing}
          className="w-full py-7 text-md font-semibold rounded-full bg-gradient-to-r from-pink-400 to-pink-600 text-white hover:from-pink-500 hover:to-pink-700 disabled:opacity-50"
        >
          {isProcessing ? "Generating Reel..." : "Generate Reel"}
        </Button>
      </div>

      {/* Right Column - Video Preview with Caption Overlay */}
      <div className="flex justify-end pr-16">
        <div className="w-74 h-[540px] rounded-2xl overflow-hidden shadow-2xl relative">
          {/* Minecraft Video - cached and preloaded */}
          <video
            ref={minecraftVideoRef}
            className={`w-full h-full object-cover absolute top-0 left-0 transition-opacity duration-300 ${
              backgroundVideo === 'minecraft' ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            src="https://odlodohhblopeekvquaa.supabase.co/storage/v1/object/public/background-videos/minecraft/mp1.mp4"
          >
            Your browser does not support the video tag.
          </video>

          {/* Subway Video - cached and preloaded */}
          <video
            ref={subwayVideoRef}
            className={`w-full h-full object-cover absolute top-0 left-0 transition-opacity duration-300 ${
              backgroundVideo === 'subway' ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            src="https://odlodohhblopeekvquaa.supabase.co/storage/v1/object/public/background-videos/subway/ss1.mp4"
          >
            Your browser does not support the video tag.
          </video>

          {/* Mega Ramp Video - cached and preloaded */}
          <video
            ref={megaRampVideoRef}
            className={`w-full h-full object-cover absolute top-0 left-0 transition-opacity duration-300 ${
              backgroundVideo === 'mega-ramp' ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            src="https://odlodohhblopeekvquaa.supabase.co/storage/v1/object/public/background-videos/gta/gta1.mp4"
          >
            Your browser does not support the video tag.
          </video>
          
          {/* Caption Preview Overlay */}
          <div 
            className="absolute left-1/2 text-center max-w-[90%] px-4 pointer-events-none z-10"
            style={{
              ...getPositionStyle(captionOptions.position),
              fontFamily: captionOptions.font,
              fontSize: getFontSize(captionOptions.size),
              fontWeight: 'bold',
              color: 'white',
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8), -1px -1px 2px rgba(0, 0, 0, 0.8), 1px -1px 2px rgba(0, 0, 0, 0.8), -1px 1px 2px rgba(0, 0, 0, 0.8)',
              lineHeight: '1.2',
              wordWrap: 'break-word'
            }}
          >
            Captions
          </div>
        </div>
      </div>
    </div>
  )
} 