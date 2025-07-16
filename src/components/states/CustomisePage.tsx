import React from "react"
import { Button } from "@/components/ui/button"
import { VideoFormat, BackgroundVideo, VideoStyle } from "./types"

interface CustomisePageProps {
  videoFormat: VideoFormat
  setVideoFormat: (format: VideoFormat) => void
  backgroundVideo: BackgroundVideo
  setBackgroundVideo: (bg: BackgroundVideo) => void
  videoStyle: VideoStyle
  setVideoStyle: (style: VideoStyle) => void
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
  generateReel,
  isProcessing
}: CustomisePageProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
      {/* Left Column */}
      <div className="space-y-8">
        <h2 className="text-4xl font-bold">Customise Reels</h2>
        
        <div className="space-y-8">
          {/* Video Format */}
          <div className="space-y-4">
            <h3 className="text-2xl font-semibold">Video Format</h3>
            <div className="flex gap-4">
              {(['summary', 'splitscreen', 'quiz'] as const).map((format) => (
                <Button
                  key={format}
                  onClick={() => setVideoFormat(format)}
                  variant={videoFormat === format ? "default" : "outline"}
                  className={`px-6 py-3 rounded-full capitalize ${
                    videoFormat === format
                      ? 'bg-pink-500 text-white border-pink-500'
                      : 'border-2 border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {format === 'splitscreen' ? 'Split Screen' : format}
                </Button>
              ))}
            </div>
          </div>

          {/* Background video */}
          <div className="space-y-4">
            <h3 className="text-2xl font-semibold">Background video</h3>
            <div className="flex gap-4">
              {(['minecraft', 'subway', 'characters'] as const).map((bg) => (
                <Button
                  key={bg}
                  onClick={() => setBackgroundVideo(bg)}
                  variant={backgroundVideo === bg ? "default" : "outline"}
                  className={`px-6 py-3 rounded-full capitalize ${
                    backgroundVideo === bg
                      ? 'bg-pink-500 text-white border-pink-500'
                      : 'border-2 border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {bg === 'minecraft' ? 'Minecraft Parkour' : 
                   bg === 'subway' ? 'Subway Surfers' : 'Characters'}
                </Button>
              ))}
            </div>
          </div>

          {/* Video style */}
          <div className="space-y-4">
            <h3 className="text-2xl font-semibold">Video style</h3>
            <div className="flex gap-4">
              {(['brainrot', 'academic', 'unhinged'] as const).map((style) => (
                <Button
                  key={style}
                  onClick={() => setVideoStyle(style)}
                  variant={videoStyle === style ? "default" : "outline"}
                  className={`px-6 py-3 rounded-full capitalize ${
                    videoStyle === style
                      ? 'bg-pink-500 text-white border-pink-500'
                      : 'border-2 border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {style}
                </Button>
              ))}
            </div>
          </div>

          <Button
            onClick={generateReel}
            disabled={isProcessing}
            className="w-full py-4 text-lg font-semibold rounded-full bg-gradient-to-r from-pink-400 to-pink-600 text-white hover:from-pink-500 hover:to-pink-700 disabled:opacity-50"
          >
            {isProcessing ? "Generating Reel..." : "Generate Reel"}
          </Button>
        </div>
      </div>

      {/* Right Column - Video Preview */}
      <div className="flex justify-center">
        <div className="w-80 h-[500px] rounded-2xl overflow-hidden shadow-2xl">
          <video
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            src="https://fvosffjhogwahewymkjj.supabase.co/storage/v1/object/public/generated-videos//video_1752327164073_topic3.mp4"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    </div>
  )
} 