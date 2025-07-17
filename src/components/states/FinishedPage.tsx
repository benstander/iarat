import React from "react"
import { Button } from "@/components/ui/button"
import ProgressBar from "@/components/ui/ProgressBar"

interface FinishedPageProps {
  generatedVideoUrl: string
  resetToLanding: () => void
}

export default function FinishedPage({
  generatedVideoUrl,
  resetToLanding
}: FinishedPageProps) {
  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = generatedVideoUrl
    link.download = 'brainrot-reel.mp4'
    link.click()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center min-h-[66vh]">
      {/* Left Column */}
      <div className="space-y-20 pl-16">
        <div className="gap-6 flex flex-col">
          <h2 className="text-4xl font-bold leading-tight">
            Congratulations, you are <br />
            officially <span className="text-pink-500">cooked!</span>
          </h2>
          <p className="text-2xl text-gray-700">
            Your notes have been transfomed into a reel.
          </p>
        </div>
        
        <div className="space-y-4">
          {generatedVideoUrl && (
            <Button
              onClick={handleDownload}
              variant="outline"
              className="w-full py-7 text-lg font-semibold rounded-full border-1 border-gray-700 text-gray-700 hover:border-gray-400"
            >
              Download Video
            </Button>
          )}

          <Button
            onClick={resetToLanding}
            className="w-full py-7 text-md font-semibold rounded-full bg-gradient-to-r from-pink-400 to-pink-600 text-white hover:from-pink-500 hover:to-pink-700 disabled:opacity-50"
          >
            Create Another Reel
          </Button>
        </div>
      </div>

      {/* Right Column - Generated Video */}
      <div className="flex justify-end pr-16">
        <div className="w-74 h-[540px] rounded-2xl overflow-hidden shadow-2xl">
          {generatedVideoUrl ? (
            <video
              className="w-full h-full object-cover"
              controls
              autoPlay
              loop
              muted
              src={generatedVideoUrl}
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500">Video not available</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 