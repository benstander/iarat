"use client"

import type React from "react"
import { useState } from "react"

  // Import types and components
import { 
  LandingPage,
  CustomisePage,
  FinishedPage,
  VideoFormat, 
  BackgroundVideo, 
  BackgroundVideoSelection,
  VoiceOptions,
  VoiceStyle,
  VoiceCharacter,
  VideoDialogue,
  CaptionOptions,
  CaptionFont,
  CaptionTextSize,
  CaptionPosition,
  Topic,
  TopicSummary
} from "@/components/states"

// Import shared components
import Header from "@/components/shared/Header"

export default function Home() {
  const [currentState, setCurrentState] = useState<'landing' | 'customise' | 'finished'>('landing')
  const [lectureLink, setLectureLink] = useState("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [videoFormat, setVideoFormat] = useState<VideoFormat>('summary')
  const [backgroundVideoSelection, setBackgroundVideoSelection] = useState<BackgroundVideoSelection>({
    category: 'gaming',
    video: 'subway'
  })
  const [voiceOptions, setVoiceOptions] = useState<VoiceOptions>({
    style: 'academic',
    character: 'storyteller',
    dialogue: null
  })
  const [captionOptions, setCaptionOptions] = useState<CaptionOptions>({
    font: 'impact',
    textSize: 'medium',
    position: 'middle'
  })
  const [topics, setTopics] = useState<Topic[]>([])
  const [topicSummaries, setTopicSummaries] = useState<TopicSummary[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState("")

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0])
    }
  }

  // Voice option setters
  const setVoiceStyle = (style: VoiceStyle) => {
    setVoiceOptions(prev => ({ ...prev, style }))
  }

  const setVoiceCharacter = (character: VoiceCharacter) => {
    setVoiceOptions(prev => ({ ...prev, character }))
  }

  const setVideoDialogue = (dialogue: VideoDialogue) => {
    setVoiceOptions(prev => ({ ...prev, dialogue }))
  }

  // Caption option setters
  const setCaptionFont = (font: CaptionFont) => {
    setCaptionOptions(prev => ({ ...prev, font }))
  }

  const setCaptionTextSize = (textSize: CaptionTextSize) => {
    setCaptionOptions(prev => ({ ...prev, textSize }))
  }

  const setCaptionPosition = (position: CaptionPosition) => {
    setCaptionOptions(prev => ({ ...prev, position }))
  }

  // Generate topics from landing page and go to customise
  const processInputAndGenerateTopics = async () => {
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
      
      // Convert summaries to topics for the UI
      const generatedTopics: Topic[] = data.summaries.map((summary: TopicSummary, index: number) => ({
        id: `topic_${index}`,
        title: summary.topicTitle,
        selected: index === 0 // Select first topic by default
      }))
      
      setTopics(generatedTopics)
      setCurrentState('customise')
      
    } catch (error) {
      console.error('Error processing input:', error)
      alert('Failed to process input. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  // Generate video from customise page
  const generateReel = async (customInstructions?: string) => {
    const selectedTopics = topics.filter(topic => topic.selected)
    
    if (selectedTopics.length === 0) {
      alert("Please select at least one topic!")
      return
    }

    setIsProcessing(true)
    
    try {
      // Filter summaries based on selected topics
      const selectedSummaries = topicSummaries.filter(summary => 
        selectedTopics.some(topic => topic.title === summary.topicTitle)
      )
      
      // Generate video with selected summaries
      const videoResponse = await fetch('/api/createVideo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summaries: selectedSummaries.length > 0 ? selectedSummaries : topicSummaries.slice(0, selectedTopics.length),
          backgroundVideo: backgroundVideoSelection.video || 'mega-ramp',
          voiceEnabled: true,
          videoFormat,
          voiceOptions,
          captionOptions,
          customInstructions,
        }),
      })

      if (!videoResponse.ok) {
        throw new Error('Failed to generate video')
      }

      const videoData = await videoResponse.json()
      if (videoData.videos && videoData.videos.length > 0 && videoData.videos[0].videoUrl) {
        setGeneratedVideoUrl(videoData.videos[0].videoUrl)
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
    setGeneratedVideoUrl("")
    setVideoFormat('summary')
    setBackgroundVideoSelection({
      category: 'gaming',
      video: 'subway'
    })
    setVoiceOptions({
      style: 'academic',
      character: 'storyteller',
      dialogue: null
    })
    setCaptionOptions({
      font: 'impact',
      textSize: 'medium',
      position: 'middle'
    })
    setTopics([])
    setTopicSummaries([])
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
            processInput={processInputAndGenerateTopics}
            isProcessing={isProcessing}
            removeUploadedFile={() => setUploadedFile(null)}
          />
        )
      case 'customise':
        return (
          <CustomisePage
            videoFormat={videoFormat}
            setVideoFormat={setVideoFormat}
            backgroundVideoSelection={backgroundVideoSelection}
            setBackgroundVideoSelection={setBackgroundVideoSelection}
            voiceOptions={voiceOptions}
            setVoiceStyle={setVoiceStyle}
            setVoiceCharacter={setVoiceCharacter}
            setVideoDialogue={setVideoDialogue}
            captionOptions={captionOptions}
            setCaptionFont={setCaptionFont}
            setCaptionTextSize={setCaptionTextSize}
            setCaptionPosition={setCaptionPosition}
            topics={topics}
            setTopics={setTopics}
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
            processInput={processInputAndGenerateTopics}
            isProcessing={isProcessing}
            removeUploadedFile={() => setUploadedFile(null)}
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



