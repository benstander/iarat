"use client"

import type React from "react"
import { useState } from "react"

// Import types and components
import { 
  TopicSummary, 
  AppState, 
  VideoFormat, 
  BackgroundVideo, 
  VideoStyle,
  LandingPage,
  TopicsPage,
  CustomisePage,
  FinishedPage
} from "@/components/states"

// Import shared components
import Header from "@/components/shared/Header"

export default function Home() {
  const [currentState, setCurrentState] = useState<AppState>('landing')
  const [lectureLink, setLectureLink] = useState("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [topicSummaries, setTopicSummaries] = useState<TopicSummary[]>([])
  const [selectedTopics, setSelectedTopics] = useState<Set<number>>(new Set())
  const [videoFormat, setVideoFormat] = useState<VideoFormat>('summary')
  const [backgroundVideo, setBackgroundVideo] = useState<BackgroundVideo>('subway')
  const [videoStyle, setVideoStyle] = useState<VideoStyle>('brainrot')
  const [isProcessing, setIsProcessing] = useState(false)
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState("")

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0])
    }
  }

  const processInput = async () => {
    if (!lectureLink.trim() && !uploadedFile) {
      alert("Please provide a lecture link or upload a file!")
      return
    }

    setIsProcessing(true)
    
    try {
      let response
      
      if (uploadedFile) {
        const formData = new FormData()
        formData.append('pdf', uploadedFile)
        
        response = await fetch('/api/pdfUpload', {
          method: 'POST',
          body: formData,
        })
      } else {
        response = await fetch('/api/youtubeUpload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            youtubeUrl: lectureLink,
          }),
        })
      }

      if (!response.ok) {
        throw new Error('Failed to process input')
      }

      const data = await response.json()
      setTopicSummaries(data.summaries)
      setCurrentState('topics')
      
    } catch (error) {
      console.error('Error processing input:', error)
      alert('Failed to process input. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleTopicToggle = (topicIndex: number) => {
    const newSelected = new Set(selectedTopics)
    if (newSelected.has(topicIndex)) {
      newSelected.delete(topicIndex)
    } else {
      newSelected.add(topicIndex)
    }
    setSelectedTopics(newSelected)
  }

  const continueToCustomise = () => {
    if (selectedTopics.size === 0) {
      alert("Please select at least one topic!")
      return
    }
    setCurrentState('customise')
  }

  const generateReel = async () => {
    setIsProcessing(true)
    
    try {
      const selectedSummaries = topicSummaries.filter(summary => selectedTopics.has(summary.topicIndex))
      
      const response = await fetch('/api/createVideo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summaries: selectedSummaries,
          backgroundVideo: backgroundVideo === 'subway' ? 'subway' : 'minecraft',
          voiceEnabled: true,
          videoFormat,
          videoStyle
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate video')
      }

      const data = await response.json()
      if (data.videos && data.videos.length > 0 && data.videos[0].videoUrl) {
        setGeneratedVideoUrl(data.videos[0].videoUrl)
        setCurrentState('finished')
      }
      
    } catch (error) {
      console.error('Error generating video:', error)
      alert('Failed to generate video. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const resetToLanding = () => {
    setCurrentState('landing')
    setLectureLink("")
    setUploadedFile(null)
    setTopicSummaries([])
    setSelectedTopics(new Set())
    setGeneratedVideoUrl("")
    setVideoFormat('summary')
    setBackgroundVideo('subway')
    setVideoStyle('brainrot')
  }

  const renderCurrentState = () => {
    switch (currentState) {
      case 'landing':
        return (
          <LandingPage
            lectureLink={lectureLink}
            setLectureLink={setLectureLink}
            uploadedFile={uploadedFile}
            handleFileUpload={handleFileUpload}
            processInput={processInput}
            isProcessing={isProcessing}
          />
        )
      case 'topics':
        return (
          <TopicsPage
            topicSummaries={topicSummaries}
            selectedTopics={selectedTopics}
            handleTopicToggle={handleTopicToggle}
            continueToCustomise={continueToCustomise}
          />
        )
      case 'customise':
        return (
          <CustomisePage
            videoFormat={videoFormat}
            setVideoFormat={setVideoFormat}
            backgroundVideo={backgroundVideo}
            setBackgroundVideo={setBackgroundVideo}
            videoStyle={videoStyle}
            setVideoStyle={setVideoStyle}
            generateReel={generateReel}
            isProcessing={isProcessing}
          />
        )
      case 'finished':
        return (
          <FinishedPage
            generatedVideoUrl={generatedVideoUrl}
            resetToLanding={resetToLanding}
          />
        )
      default:
        return (
          <LandingPage
            lectureLink={lectureLink}
            setLectureLink={setLectureLink}
            uploadedFile={uploadedFile}
            handleFileUpload={handleFileUpload}
            processInput={processInput}
            isProcessing={isProcessing}
          />
        )
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-8 py-12">
        <Header />
        {renderCurrentState()}
      </div>
    </div>
  )
}



