import React from "react"
import { Button } from "@/components/ui/button"
import { TopicSummary } from "./types"
import ProgressBar from "@/components/ui/ProgressBar"

interface TopicsPageProps {
  topicSummaries: TopicSummary[]
  selectedTopics: Set<number>
  handleTopicToggle: (topicIndex: number) => void
  continueToCustomise: () => void
  isProcessing: boolean
}

export default function TopicsPage({
  topicSummaries,
  selectedTopics,
  handleTopicToggle,
  continueToCustomise,
  isProcessing
}: TopicsPageProps) {
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