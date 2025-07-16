import React from "react"
import { Button } from "@/components/ui/button"
import { VideoFormat, BackgroundVideo, VideoStyle } from "./types"
import ProgressBar from "@/components/ui/ProgressBar"

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
      <div className="pl-16 flex flex-col justify-between min-h-[540px] h-[540px]">
        <div className="space-y-8">
          {/* Video Format */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Video Format</h3>
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
                  className={`flex-1 px-0 py-6 rounded-full text-sm text-black bg-white border-2 ${
                    videoFormat === value
                      ? 'border-pink-500'
                      : 'border-black'
                  }`}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Background video */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Background video</h3>
            <div className="flex gap-4 w-full">
              {(['minecraft', 'subway', 'characters'] as const).map((bg) => (
                <Button
                  key={bg}
                  onClick={() => setBackgroundVideo(backgroundVideo === bg ? null : bg)}
                  variant="outline"
                  className={`flex-1 px-0 py-6 rounded-full text-sm text-black bg-white border-2 capitalize ${
                    backgroundVideo === bg
                      ? 'border-pink-500'
                      : 'border-black'
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
            <h3 className="text-lg font-semibold">Video style</h3>
            <div className="flex gap-4 w-full">
              {(['academic', 'brainrot', 'unhinged'] as const).map((style) => (
                <Button
                  key={style}
                  onClick={() => setVideoStyle(videoStyle === style ? null : style)}
                  variant="outline"
                  className={`flex-1 px-0 py-6 rounded-full text-sm text-black bg-white border-2 capitalize ${
                    videoStyle === style
                      ? 'border-pink-500'
                      : 'border-black'
                  }`}
                >
                  {style}
                </Button>
              ))}
            </div>
          </div>

        </div>
        <Button
          onClick={generateReel}
          disabled={isProcessing}
          className="w-full py-7 text-md font-semibold rounded-full bg-gradient-to-r from-pink-400 to-pink-600 text-white hover:from-pink-500 hover:to-pink-700 disabled:opacity-50"
        >
          {isProcessing ? "Generating Reel..." : "Generate Reel"}
        </Button>
      </div>

      {/* Right Column - Video Preview */}
      <div className="flex justify-end pr-16">
        <div className="w-74 h-[540px] rounded-2xl overflow-hidden shadow-2xl">
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