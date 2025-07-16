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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
      {/* Left Column */}
      <div className="space-y-8">
        <h2 className="text-4xl font-bold">Your Reel is Ready!</h2>
        <p className="text-xl text-gray-600">
          Your brainrot reel has been generated successfully.
        </p>
        
        <div className="space-y-4">
          <Button
            onClick={resetToLanding}
            className="w-full py-4 text-lg font-semibold rounded-full bg-gradient-to-r from-pink-400 to-pink-600 text-white hover:from-pink-500 hover:to-pink-700"
          >
            Create Another Reel
          </Button>
          
          {generatedVideoUrl && (
            <Button
              onClick={handleDownload}
              variant="outline"
              className="w-full py-4 text-lg font-semibold rounded-full border-2 border-gray-300 text-gray-700 hover:border-gray-400"
            >
              Download Video
            </Button>
          )}
        </div>
      </div>

      {/* Right Column - Generated Video */}
      <div className="flex justify-center">
        <div className="w-80 h-[500px] rounded-2xl overflow-hidden shadow-2xl">
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