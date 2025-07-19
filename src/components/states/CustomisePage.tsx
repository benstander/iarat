import React from "react"
import { Button } from "@/components/ui/button"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { VideoFormat, BackgroundVideo, VideoStyle, CaptionOptions, CaptionFont, CaptionSize, CaptionPosition } from "./types"

interface CustomisePageProps {
  videoFormat: VideoFormat
  setVideoFormat: (format: VideoFormat) => void
  backgroundVideo: BackgroundVideo
  setBackgroundVideo: (bg: BackgroundVideo) => void
  videoStyle: VideoStyle
  setVideoStyle: (style: VideoStyle) => void
  captionOptions: CaptionOptions
  setCaptionFont: (font: CaptionFont) => void
  setCaptionSize: (size: CaptionSize) => void
  setCaptionPosition: (position: CaptionPosition) => void
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
  captionOptions,
  setCaptionFont,
  setCaptionSize,
  setCaptionPosition,
  generateReel,
  isProcessing
}: CustomisePageProps) {
  // Helper function to get font size in pixels
  const getFontSize = (size: CaptionSize) => {
    switch (size) {
      case 'small': return '24px'
      case 'medium': return '32px'
      case 'large': return '40px'
      case 'extra-large': return '48px'
      default: return '32px'
    }
  }

  // Helper function to get position styling
  const getPositionStyle = (position: CaptionPosition) => {
    switch (position) {
      case 'top': return { top: '10%', transform: 'translateX(-50%)' }
      case 'middle': return { top: '50%', transform: 'translate(-50%, -50%)' }
      case 'bottom': return { bottom: '10%', transform: 'translateX(-50%)' }
      default: return { bottom: '10%', transform: 'translateX(-50%)' }
    }
  }

  // Helper function to get video URL based on background selection
  const getBackgroundVideoUrl = (bg: BackgroundVideo) => {
    switch (bg) {
      case 'minecraft':
        return 'https://fvosffjhogwahewymkjj.supabase.co/storage/v1/object/public/background-videos/minecraft-parkour.mp4'
      case 'subway':
        return 'https://fvosffjhogwahewymkjj.supabase.co/storage/v1/object/public/background-videos/subway-surfers.mp4'
      case 'video':
        return 'https://fvosffjhogwahewymkjj.supabase.co/storage/v1/object/public/background-videos/generic-video.mp4'
      default:
        // Default fallback video
        return 'https://fvosffjhogwahewymkjj.supabase.co/storage/v1/object/public/generated-videos//video_1752327164073_topic3.mp4'
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
      {/* Left Column */}
      <div className="pl-16 flex flex-col justify-between min-h-[540px] h-[540px]">
        <div className="space-y-12">
      
          {/* Video style */}
          <div className="space-y-4">
            <h3 className="text-md font-semibold">Video style</h3>
            <div className="flex gap-4 w-full">
              {(['academic', 'brainrot', 'unhinged'] as const).map((style) => (
                <Button
                  key={style}
                  onClick={() => setVideoStyle(videoStyle === style ? null : style)}
                  variant="outline"
                  className={`flex-1 px-0 py-6 rounded-full text-sm text-black bg-white border capitalize ${
                    videoStyle === style
                      ? 'border-pink-500 bg-pink-50 border-[1.5px]'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {style}
                </Button>
              ))}
            </div>
          </div>

          {/* Background video */}
          <div className="space-y-4">
            <h3 className="text-md font-semibold">Background video</h3>
            <div className="flex gap-4 w-full">
              {(['minecraft', 'subway', 'video'] as const).map((bg) => (
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
                   bg === 'video' ? 'Video Clip' :
                   'Video'}
                </Button>
              ))}
            </div>
          </div>

          {/** Video Format 
          <div className="space-y-4">
            <h3 className="text-md font-semibold">Video format</h3>
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
          */}
          
          {/* Custom Captions */}
          <div className="space-y-4">
            <h3 className="text-md font-semibold">Custom captions</h3>
            <div className="flex gap-4 w-full">
              {/* Font Selection */}
              <Select value={captionOptions.font} onValueChange={setCaptionFont}>
                <SelectTrigger className="flex-1 px-6 py-6 rounded-full text-sm text-black bg-white border border-gray-200 hover:border-gray-300 h-auto">
                  <SelectValue placeholder="Font" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Arial Black">Arial Black</SelectItem>
                  <SelectItem value="Helvetica">Helvetica</SelectItem>
                  <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                  <SelectItem value="Impact">Impact</SelectItem>
                  <SelectItem value="Comic Sans MS">Comic Sans MS</SelectItem>
                </SelectContent>
              </Select>

              {/* Size Selection */}
              <Select value={captionOptions.size} onValueChange={setCaptionSize}>
                <SelectTrigger className="flex-1 px-6 py-6 rounded-full text-sm text-black bg-white border border-gray-200 hover:border-gray-300 h-auto capitalize">
                  <SelectValue placeholder="Size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                  <SelectItem value="extra-large">Extra Large</SelectItem>
                </SelectContent>
              </Select>

              {/* Position Selection */}
              <Select value={captionOptions.position} onValueChange={setCaptionPosition}>
                <SelectTrigger className="flex-1 px-6 py-6 rounded-full text-sm text-black bg-white border border-gray-200 hover:border-gray-300 h-auto capitalize">
                  <SelectValue placeholder="Position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top">Top</SelectItem>
                  <SelectItem value="middle">Middle</SelectItem>
                  <SelectItem value="bottom">Bottom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

        </div>
        <Button
          onClick={generateReel}
          disabled={isProcessing}
          className="w-full py-7 text-md font-semibold rounded-full bg-gradient-to-r from-pink-400 to-pink-600 text-white hover:from-pink-500 hover:to-pink-700 disabled:opacity-50"
        >
          {isProcessing ? "Splitting into topics..." : "Continue"}
        </Button>
      </div>

      {/* Right Column - Video Preview with Caption Overlay */}
      <div className="flex justify-end pr-16">
        <div className="w-74 h-[540px] rounded-2xl overflow-hidden shadow-2xl relative">
          <video
            key={backgroundVideo} // Force re-render when background changes
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            src={getBackgroundVideoUrl(backgroundVideo)}
          >
            Your browser does not support the video tag.
          </video>
          
          {/* Caption Preview Overlay */}
          <div 
            className="absolute left-1/2 text-center max-w-[90%] px-4 pointer-events-none"
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
            This is how your captions will look in the final video
          </div>
        </div>
      </div>
    </div>
  )
} 