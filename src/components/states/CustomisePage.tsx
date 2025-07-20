import React, { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  VideoFormat, 
  BackgroundVideo, 
  VideoStyle, 
  CaptionOptions, 
  CaptionFont, 
  CaptionSize, 
  CaptionPosition,
  VoiceOptions,
  VoiceStyle,
  VoiceCharacter,
  Topic,
  CustomiseTab
} from "./types"

interface CustomisePageProps {
  videoFormat: VideoFormat
  setVideoFormat: (format: VideoFormat) => void
  backgroundVideo: BackgroundVideo
  setBackgroundVideo: (bg: BackgroundVideo) => void
  videoStyle: VideoStyle
  setVideoStyle: (style: VideoStyle) => void
  voiceOptions: VoiceOptions
  setVoiceStyle: (style: VoiceStyle) => void
  setVoiceCharacter: (character: VoiceCharacter) => void
  captionOptions: CaptionOptions
  setCaptionFont: (font: CaptionFont) => void
  setCaptionSize: (size: CaptionSize) => void
  setCaptionPosition: (position: CaptionPosition) => void
  topics: Topic[]
  setTopics: (topics: Topic[]) => void
  generateReel: () => void
  isProcessing: boolean
}

export default function CustomisePage({
  videoFormat,
  setVideoFormat,
  backgroundVideo,
  setBackgroundVideo,
  videoStyle,
  setVideoStyle,
  voiceOptions,
  setVoiceStyle,
  setVoiceCharacter,
  captionOptions,
  setCaptionFont,
  setCaptionSize,
  setCaptionPosition,
  topics,
  setTopics,
  generateReel,
  isProcessing
}: CustomisePageProps) {
  const [currentTab, setCurrentTab] = useState<CustomiseTab>('video')
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

  // Toggle topic selection
  const toggleTopic = (topicId: string) => {
    setTopics(topics.map(topic => 
      topic.id === topicId ? { ...topic, selected: !topic.selected } : topic
    ))
  }

  // Get continue button text based on current tab
  const getContinueButtonText = () => {
    switch (currentTab) {
      case 'video': return 'Continue to voice'
      case 'voice': return 'Continue to captions'
      case 'captions': return 'Continue to topics'
      case 'topics': return isProcessing ? 'Generating video...' : 'Generate video'
      default: return 'Continue'
    }
  }

  // Handle continue button click
  const handleContinue = () => {
    switch (currentTab) {
      case 'video':
        setCurrentTab('voice')
        break
      case 'voice':
        setCurrentTab('captions')
        break
      case 'captions':
        setCurrentTab('topics')
        break
      case 'topics':
        const selectedTopics = topics.filter(topic => topic.selected)
        if (selectedTopics.length === 0) {
          alert("Please select at least one topic!")
          return
        }
        generateReel()
        break
    }
  }

  const renderTabContent = () => {
    switch (currentTab) {
      case 'video':
        return (
          <div className="space-y-8">
            {/* Video Format */}
            <div className="space-y-4">
              <h3 className="text-md font-semibold">Video Format</h3>
              <div className="flex gap-4 w-full">
                {([
                  { value: 'summary', label: 'Summary' },
                  { value: 'splitscreen', label: 'Split Screen' },
                  { value: 'quiz', label: 'Quiz' }
                ] as const).map(({ value, label }) => (
                  <Button
                    key={value}
                    onClick={() => setVideoFormat(videoFormat === value ? null : value)}
                    variant="outline"
                    className={`flex-1 px-0 py-6 rounded-full text-sm text-black bg-white ${
                      videoFormat === value
                        ? 'border-pink-500 bg-pink-50 border-[1.5px]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Background video */}
            <div className="space-y-4">
              <h3 className="text-md font-semibold">Background video</h3>
              <div className="flex gap-4 w-full">
                {(['minecraft', 'subway', 'mega-ramp'] as const).map((bg) => (
                  <Button
                    key={bg}
                    onClick={() => setBackgroundVideo(backgroundVideo === bg ? null : bg)}
                    variant="outline"
                    className={`flex-1 px-0 py-6 rounded-full text-sm text-black bg-white capitalize ${
                      backgroundVideo === bg
                        ? 'border-pink-500 bg-pink-50 border-[1.5px]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {bg === 'minecraft' ? 'Minecraft Parkour' : 
                     bg === 'subway' ? 'Subway Surfers' :
                     bg === 'mega-ramp' ? 'Mega Ramp' :
                     'Video'}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )

      case 'voice':
        return (
          <div className="space-y-8">
            {/* Voice style */}
            <div className="space-y-4">
              <h3 className="text-md font-semibold">Voice style</h3>
              <div className="flex gap-4 w-full">
                {(['academic', 'brainrot', 'unhinged'] as const).map((style) => (
                  <Button
                    key={style}
                    onClick={() => setVoiceStyle(voiceOptions.style === style ? null : style)}
                    variant="outline"
                    className={`flex-1 px-0 py-6 rounded-full text-sm text-black bg-white border capitalize ${
                      voiceOptions.style === style
                        ? 'border-pink-500 bg-pink-50 border-[1.5px]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {style}
                  </Button>
                ))}
              </div>
            </div>

            {/* Voice character */}
            <div className="space-y-4">
              <h3 className="text-md font-semibold">Voice character</h3>
              <div className="flex gap-4 w-full">
                {(['bella', 'andrew', 'lebron'] as const).map((character) => (
                  <Button
                    key={character}
                    onClick={() => setVoiceCharacter(voiceOptions.character === character ? null : character)}
                    variant="outline"
                    className={`flex-1 px-0 py-6 rounded-full text-sm text-black bg-white border capitalize ${
                      voiceOptions.character === character
                        ? 'border-pink-500 bg-pink-50 border-[1.5px]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {character}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )

      case 'captions':
        return (
          <div className="space-y-6">
            {/* Font */}
            <div className="space-y-4">
              <h3 className="text-md font-semibold">Font</h3>
              <div className="flex gap-4 w-full">
                {(['Arial', 'Impact', 'Bebas Neue'] as const).map((font) => (
                  <Button
                    key={font}
                    onClick={() => setCaptionFont(font)}
                    variant="outline"
                    className={`flex-1 px-0 py-6 rounded-full text-sm text-black bg-white border ${
                      captionOptions.font === font
                        ? 'border-pink-500 bg-pink-50 border-[1.5px]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {font}
                  </Button>
                ))}
              </div>
            </div>

            {/* Text size */}
            <div className="space-y-4">
              <h3 className="text-md font-semibold">Text size</h3>
              <div className="flex gap-4 w-full">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <Button
                    key={size}
                    onClick={() => setCaptionSize(size)}
                    variant="outline"
                    className={`flex-1 px-0 py-6 rounded-full text-sm text-black bg-white border capitalize ${
                      captionOptions.size === size
                        ? 'border-pink-500 bg-pink-50 border-[1.5px]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>

            {/* Caption position */}
            <div className="space-y-4">
              <h3 className="text-md font-semibold">Caption position</h3>
              <div className="flex gap-4 w-full">
                {(['top', 'middle', 'bottom'] as const).map((position) => (
                  <Button
                    key={position}
                    onClick={() => setCaptionPosition(position)}
                    variant="outline"
                    className={`flex-1 px-0 py-6 rounded-full text-sm text-black bg-white border capitalize ${
                      captionOptions.position === position
                        ? 'border-pink-500 bg-pink-50 border-[1.5px]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {position}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )

      case 'topics':
        return (
          <div className="space-y-3 pr-2">
            {topics.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>No topics available. Please go back to the landing page to process your content.</p>
              </div>
            ) : (
              topics.map((topic) => (
                <div
                  key={topic.id}
                  onClick={() => toggleTopic(topic.id)}
                  className={`w-full px-6 py-4 rounded-full text-sm text-black font-medium bg-white border capitalize cursor-pointer ${
                    topic.selected
                       ? 'border-pink-500 bg-pink-50 border-[1.5px]'
                       : 'border-gray-200 hover:border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {topic.title}
                </div>
              ))
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-120 items-start">
      {/* Left Column */}
      <div className="pl-16 col-span-1 lg:col-span-2 flex flex-col justify-between min-h-[560px] h-[540px]">
        {/* Tab Navigation */}
        <div className="flex flex-col h-full">
          <div className="flex border-b border-gray-200 mb-6">
            {(['video', 'voice', 'captions', 'topics'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setCurrentTab(tab)}
                className={`flex-1 pb-5 text-md font-medium capitalize transition-colors relative ${
                  currentTab === tab
                    ? 'text-pink-500'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
                {currentTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500" />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content - Scrollable area */}
          <div className="flex-1 overflow-y-auto mb-6">
            {renderTabContent()}
          </div>

          {/* Continue Button - Always at bottom */}
          <Button
            onClick={handleContinue}
            disabled={isProcessing || (currentTab === 'topics' && topics.filter(topic => topic.selected).length === 0)}
            className="w-full py-7 text-md font-semibold rounded-full bg-gradient-to-r from-pink-400 to-pink-600 text-white hover:from-pink-500 hover:to-pink-700 disabled:opacity-50"
          >
            {getContinueButtonText()}
          </Button>
        </div>
      </div>

      {/* Right Column - Video Preview with Caption Overlay */}
      <div className="col-span-1 flex justify-end pr-16">
        <div className="h-[560px] rounded-2xl overflow-hidden shadow-2xl relative min-w-[300px]">
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
              fontFamily: captionOptions.font === 'Bebas Neue' ? 'var(--font-bebas-neue)' : captionOptions.font,
              fontSize: getFontSize(captionOptions.size),
              fontWeight: captionOptions.font === 'Bebas Neue' ? 'normal' : 'bold',
              color: 'white',
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8), -1px -1px 2px rgba(0, 0, 0, 0.8), 1px -1px 2px rgba(0, 0, 0, 0.8), -1px 1px 2px rgba(0, 0, 0, 0.8)',
              lineHeight: '1.2',
              wordWrap: 'break-word'
            }}
          >
            Your captions
          </div>
        </div>
      </div>
    </div>
  )
} 