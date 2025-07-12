"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

import { Switch } from "@/components/ui/switch"
import { Upload, FileText, Video, Link, StickyNote, Play, Download } from "lucide-react"

interface TopicSummary {
  topicTitle: string;
  script: string;
  topicIndex: number;
}

interface VideoResult {
  success: boolean;
  videoUrl?: string;
  voiceAudioUrl?: string;
  message?: string;
  topicTitle?: string;
  topicIndex?: number;
  error?: string;
}

export default function Home() {
  const [activeSection, setActiveSection] = useState<'pdf' | 'youtube' | 'notes' | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [youtubeLink, setYoutubeLink] = useState("")
  const [parsedTextContent, setParsedTextContent] = useState("")

  const [backgroundVideo, setBackgroundVideo] = useState("")
  const [memeSfx, setMemeSfx] = useState(true)
  const [voiceover, setVoiceover] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState("")

  // New state for topic-based workflow
  const [topicSummaries, setTopicSummaries] = useState<TopicSummary[]>([])
  const [generatedVideos, setGeneratedVideos] = useState<VideoResult[]>([])
  const [isGeneratingVideos, setIsGeneratingVideos] = useState(false)
  const [currentGeneratingTopic, setCurrentGeneratingTopic] = useState<string>("")
  const [viewMode, setViewMode] = useState<'upload' | 'topics'>('upload')
  const [selectedTopics, setSelectedTopics] = useState<Set<number>>(new Set())

  const handleSectionToggle = (section: 'pdf' | 'youtube' | 'notes') => {
    setActiveSection(activeSection === section ? null : section)
    // Reset topic summaries when switching sections
    setTopicSummaries([])
    setGeneratedVideos([])
    setViewMode('upload')
    setSelectedTopics(new Set())
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type === "application/pdf") {
        setUploadedFile(file)
      }
    }
  }

  const processPDF = async (file: File) => {
    if (!backgroundVideo) {
      alert("Please select a background video first!")
      return
    }

    setIsGenerating(true)
    setGeneratedVideoUrl("")
    setTopicSummaries([])
    setGeneratedVideos([])
    
    try {
      const formData = new FormData()
      formData.append('pdf', file)

      const response = await fetch('/api/pdfUpload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to process PDF')
      }

      const data = await response.json()
      console.log(`Successfully processed PDF: ${data.fileName} (${data.pageCount} pages)`)
      console.log(`Generated ${data.summaries.length} topic summaries`)
      
      // Set the topic summaries and switch to topic view
      setTopicSummaries(data.summaries)
      setViewMode('topics')
      
    } catch (error) {
      console.error('Error processing PDF:', error)
      alert('Failed to process PDF. Please try again.')
      setUploadedFile(null)
    } finally {
      setIsGenerating(false)
    }
  }

  const generateVideosForAllTopics = async () => {
    if (topicSummaries.length === 0) return

    setIsGeneratingVideos(true)
    setGeneratedVideos([])
    setCurrentGeneratingTopic("")

    try {
      const response = await fetch('/api/createVideo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summaries: topicSummaries,
          backgroundVideo: backgroundVideo === 'subway-surfers' ? 'subway' : 'minecraft',
          voiceEnabled: voiceover,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate videos')
      }

      const data = await response.json()
      console.log(`Generated ${data.successfulVideos}/${data.totalVideos} videos successfully`)
      
      setGeneratedVideos(data.videos)
      alert(`Successfully generated ${data.successfulVideos}/${data.totalVideos} videos!`)
      
    } catch (error) {
      console.error('Error generating videos:', error)
      alert('Failed to generate videos. Please try again.')
    } finally {
      setIsGeneratingVideos(false)
      setCurrentGeneratingTopic("")
    }
  }

  const generateVideoForSingleTopic = async (summary: TopicSummary) => {
    setCurrentGeneratingTopic(summary.topicTitle)

    try {
      const response = await fetch('/api/createVideo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script: summary.script,
          backgroundVideo: backgroundVideo === 'subway-surfers' ? 'subway' : 'minecraft',
          voiceEnabled: voiceover,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate video')
      }

      const data = await response.json()
      
      // Add to generated videos list
      const newVideo: VideoResult = {
        ...data,
        topicTitle: summary.topicTitle,
        topicIndex: summary.topicIndex
      }
      
      setGeneratedVideos(prev => [...prev, newVideo])
      alert(`Video for "${summary.topicTitle}" generated successfully!`)
      
    } catch (error) {
      console.error('Error generating video:', error)
      alert(`Failed to generate video for "${summary.topicTitle}". Please try again.`)
    } finally {
      setCurrentGeneratingTopic("")
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.type === "application/pdf") {
        setUploadedFile(file)
      }
    }
  }

  const handleYoutubeLinkProcess = async () => {
    if (!youtubeLink.trim()) {
      alert("Please enter a YouTube URL!")
      return
    }
    
    if (!backgroundVideo) {
      alert("Please select a background video first!")
      return
    }

    setIsGenerating(true)
    setGeneratedVideoUrl("")
    
    try {
      // First transcribe the YouTube video
      const transcribeResponse = await fetch('/api/ytTranscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          youtubeUrl: youtubeLink,
        }),
      })

      if (!transcribeResponse.ok) {
        throw new Error('Failed to transcribe YouTube video')
      }

      const transcribeData = await transcribeResponse.json()
      console.log("Successfully transcribed YouTube video")

      // Then generate script from transcript
      const scriptResponse = await fetch('/api/videoScript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          textContent: transcribeData.transcript,
        }),
      })

      if (!scriptResponse.ok) {
        throw new Error('Failed to generate script')
      }

      const scriptData = await scriptResponse.json()
      console.log("Successfully generated script from YouTube video")
      
      // Now generate the video with the script
      await generateVideoWithScript(scriptData.script)
    } catch (error) {
      console.error('Error processing YouTube video:', error)
      alert('Failed to process YouTube video. Please check the URL and try again.')
      setIsGenerating(false)
    }
  }

  const generateVideoWithScript = async (script: string) => {
    try {
      const response = await fetch('/api/createVideo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script: script,
          backgroundVideo: backgroundVideo === 'subway-surfers' ? 'subway' : 'minecraft',
          voiceEnabled: voiceover,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate video')
      }

      const data = await response.json()
      setGeneratedVideoUrl(data.videoUrl)
      alert('Video generated successfully!')
    } catch (error) {
      console.error('Error generating video:', error)
      alert('Failed to generate video. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerate = async () => {
    if (!parsedTextContent.trim()) {
      alert("Please provide text content!")
      return
    }

    if (!backgroundVideo) {
      alert("Please select a background video first!")
      return
    }

    setIsGenerating(true)
    setGeneratedVideoUrl("")

    try {
      const response = await fetch('/api/videoScript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          textContent: parsedTextContent,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate script')
      }

      const data = await response.json()
      console.log("Successfully generated script from notes")
      
      // Now generate the video with the script
      await generateVideoWithScript(data.script)
    } catch (error) {
      console.error('Error generating video script:', error)
      alert('Failed to generate video script. Please try again.')
      setIsGenerating(false)
    }
  }

  const handleBackToUpload = () => {
    setViewMode('upload')
    setTopicSummaries([])
    setGeneratedVideos([])
    setUploadedFile(null)
    setSelectedTopics(new Set())
  }

  const handleTopicSelect = (topicIndex: number) => {
    const newSelected = new Set(selectedTopics)
    if (newSelected.has(topicIndex)) {
      newSelected.delete(topicIndex)
    } else {
      newSelected.add(topicIndex)
    }
    setSelectedTopics(newSelected)
  }

  const generateVideosForSelectedTopics = async () => {
    if (selectedTopics.size === 0) {
      alert("Please select at least one topic to generate videos!")
      return
    }

    const selectedSummaries = topicSummaries.filter(summary => selectedTopics.has(summary.topicIndex))
    
    setIsGeneratingVideos(true)
    setCurrentGeneratingTopic("")

    try {
      const response = await fetch('/api/createVideo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summaries: selectedSummaries,
          backgroundVideo: backgroundVideo === 'subway-surfers' ? 'subway' : 'minecraft',
          voiceEnabled: voiceover,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate videos')
      }

      const data = await response.json()
      console.log(`Generated ${data.successfulVideos}/${data.totalVideos} videos successfully`)
      
      setGeneratedVideos(prev => [...prev, ...data.videos])
      alert(`Successfully generated ${data.successfulVideos}/${data.totalVideos} videos!`)
      
      // Clear selection after generation
      setSelectedTopics(new Set())
      
    } catch (error) {
      console.error('Error generating videos:', error)
      alert('Failed to generate videos. Please try again.')
    } finally {
      setIsGeneratingVideos(false)
      setCurrentGeneratingTopic("")
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-30">
      <div className="max-w-7xl mx-auto">
        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
                  {/* Left Column - Upload and Style Section */}
        <Card className="rounded-2xl shadow-2xl border border-gray-200 bg-white text-black h-[600px] flex flex-col overflow-hidden">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="text-2xl font-bold text-black flex items-center gap-3">
                {viewMode === 'topics' ? (
                  <>
                    <Button
                      onClick={handleBackToUpload}
                      variant="ghost"
                      size="sm"
                      className="p-2 h-8 w-8 hover:bg-gray-100"
                    >
                      ←
                    </Button>
                    <StickyNote className="h-6 w-6" />
                    Select Topic to Generate
                  </>
                ) : (
                  <>
                    <Upload className="h-6 w-6" />
                    Create Your Video
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col overflow-hidden">
              {viewMode === 'topics' ? (
                // Topic Selection View
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <p className="text-sm text-gray-600">
                      {topicSummaries.length} topics found • Select topics to generate
                    </p>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-3 pr-2 min-h-0">
                    {topicSummaries.map((summary, index) => {
                      const isSelected = selectedTopics.has(summary.topicIndex)
                      const existingVideo = generatedVideos.find(v => v.topicIndex === summary.topicIndex)
                      const isGenerated = existingVideo?.success
                      
                      return (
                        <div 
                          key={index} 
                          className={`p-4 rounded-lg transition-all duration-200 cursor-pointer ${
                            isGenerated 
                              ? 'bg-green-50 border-2 border-green-300' 
                              : isSelected 
                                ? 'bg-gray-100 border-2 border-black' 
                                : 'bg-gray-50 border-2 border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => {
                            if (!isGenerated) {
                              handleTopicSelect(summary.topicIndex)
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-gray-800 flex-1">
                              {summary.topicTitle}
                            </h3>
                            
                            <div className="flex items-center gap-2">
                              {isGenerated ? (
                                <div className="flex items-center gap-2">
                                  <div className="p-1 bg-green-600 rounded-full">
                                    <Play className="h-3 w-3 text-white" />
                                  </div>
                                  <div className="flex gap-1">
                                    <a
                                      href={existingVideo.videoUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      View
                                    </a>
                                    <a
                                      href={existingVideo.videoUrl}
                                      download
                                      className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Download className="h-3 w-3" />
                                    </a>
                                  </div>
                                </div>
                              ) : isSelected ? (
                                <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center">
                                  <div className="w-2 h-2 bg-white rounded-full"></div>
                                </div>
                              ) : (
                                <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Generate Button - stays inside card */}
                  <div className="border-t border-gray-200 pt-4 flex-shrink-0">
                    <Button
                      onClick={generateVideosForSelectedTopics}
                      disabled={isGeneratingVideos || selectedTopics.size === 0}
                      className="w-full h-12 rounded-[8px] font-semibold bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {isGeneratingVideos ? 
                        "Generating Videos..." : 
                        selectedTopics.size === 0 ? 
                          "Select Topics to Generate" : 
                          `Generate ${selectedTopics.size} Video${selectedTopics.size === 1 ? '' : 's'}`
                      }
                    </Button>
                  </div>
                </div>
              ) : (
                // Original Upload View - Fixed height layout
                <div className="flex flex-col h-full">
                  {/* Scrollable content area with fixed height */}
                  <div className="flex-1 overflow-y-auto pr-2 min-h-0" style={{height: 'calc(100% - 80px)'}}>
                    <div className="space-y-6">
                      {/* Three Section Blocks */}
                      <div className="grid grid-cols-3 gap-3">
                        {/* PDF Block */}
                        <div
                          onClick={() => handleSectionToggle('pdf')}
                          className={`p-4 rounded-[8px] bg-gray-100 border cursor-pointer transition-all duration-200 text-center ${
                            activeSection === 'pdf'
                              ? 'border-black bg-gray-100'
                              : 'hover:bg-gray-200'
                          }`}
                        >
                          <FileText className="h-6 w-6 mx-auto mb-2 text-gray-600" />
                          <p className="text-sm font-medium text-gray-700">PDF</p>
                        </div>

                        {/* YouTube Block */}
                        <div
                          onClick={() => handleSectionToggle('youtube')}
                          className={`p-4 rounded-[8px] bg-gray-100 border cursor-pointer transition-all duration-200 text-center ${
                            activeSection === 'youtube'
                              ? 'border-black bg-gray-100'
                              : 'hover:bg-gray-200'
                          }`}
                        >
                          <Video className="h-6 w-6 mx-auto mb-2 text-gray-600" />
                          <p className="text-sm font-medium text-gray-700">YouTube</p>
                        </div>

                        {/* Notes Block */}
                        <div
                          onClick={() => handleSectionToggle('notes')}
                          className={`p-4 rounded-[8px] bg-gray-100 border cursor-pointer transition-all duration-200 text-center ${
                            activeSection === 'notes'
                              ? 'border-black bg-gray-100'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <StickyNote className="h-6 w-6 mx-auto mb-2 text-gray-600" />
                          <p className="text-sm font-medium text-gray-700">Notes</p>
                        </div>
                      </div>

                      {/* Conditional Sections Based on Active Selection */}
                      {activeSection === 'pdf' && (
                        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                          <Label htmlFor="file-upload" className="text-sm font-medium text-gray-700">
                            PDF Upload (Drag & Drop or Click)
                          </Label>
                          <div
                            className={`relative border-2 border-dashed rounded-[10px] p-6 text-center transition-all duration-200 cursor-pointer ${
                              dragActive
                                ? "border-black bg-gray-100"
                                : uploadedFile
                                  ? "border-green-400 bg-green-100"
                                  : "border-gray-300 hover:border-gray-400 hover:bg-gray-100"
                            }`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => document.getElementById("file-upload")?.click()}
                          >
                            <Input id="file-upload" type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                            {uploadedFile ? (
                              <div className="flex items-center justify-center gap-2 text-green-700">
                                <FileText className="h-8 w-8" />
                                <span className="font-medium">{uploadedFile.name}</span>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Upload className="h-10 w-10 mx-auto text-gray-400" />
                                <p className="text-gray-700">
                                  <span className="font-medium">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-sm text-gray-400">PDF files only</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {activeSection === 'youtube' && (
                        <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                          <Label htmlFor="youtube-link" className="text-sm font-medium text-gray-700">
                            YouTube Link
                          </Label>
                          <div className="relative">
                            <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              id="youtube-link"
                              type="url"
                              placeholder="https://youtube.com/watch?v=..."
                              value={youtubeLink}
                              onChange={(e) => setYoutubeLink(e.target.value)}
                              className="pl-10 rounded-[10px] bg-gray-100 border-gray-300 text-black placeholder:text-gray-400 focus:border-gray-500 focus:ring-gray-500"
                            />
                          </div>
                        </div>
                      )}

                      {activeSection === 'notes' && (
                        <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                          <Label htmlFor="parsedTextContent" className="text-sm font-medium text-gray-700">
                            Manual Text Input
                          </Label>
                          <Textarea
                            id="parsedTextContent"
                            placeholder="Paste your course notes, lecture content, or any text you want to convert to brainrot..."
                            value={parsedTextContent}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setParsedTextContent(e.target.value)}
                            className="min-h-24 max-h-32 rounded-[10px] bg-gray-100 border-gray-300 text-black placeholder:text-gray-400 focus:border-gray-500 focus:ring-gray-500"
                          />
                        </div>
                      )}

                      {/* Background Video Section */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-black">Background Video</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            onClick={() => setBackgroundVideo(backgroundVideo === 'subway-surfers' ? '' : 'subway-surfers')}
                            variant="outline"
                            className={`h-12 rounded-[8px] font-medium bg-gray-100 text-black ${
                              backgroundVideo === 'subway-surfers'
                                ? 'border-black'
                                : 'hover:bg-gray-200'
                            }`}
                          >
                            Subway Surfers
                          </Button>
                          <Button
                            onClick={() => setBackgroundVideo(backgroundVideo === 'minecraft-parkour' ? '' : 'minecraft-parkour')}
                            variant="outline"
                            className={`h-12 rounded-[8px] font-medium bg-gray-100 text-black ${
                              backgroundVideo === 'minecraft-parkour'
                                ? 'border-black'
                                : 'hover:bg-gray-200'
                            }`}
                          >
                            Minecraft Parkour
                          </Button>
                        </div>
                      </div>

                      {/* Voice & Audio Section */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-black">Voice & Audio</Label>
                        <div className="flex items-center justify-between p-3 bg-gray-100 rounded-[8px]">
                          <div className="flex items-center space-x-2">
                            <Label htmlFor="voiceover" className="text-sm font-medium text-black">
                              AI Voiceover
                            </Label>
                          </div>
                          <Switch
                            id="voiceover"
                            checked={voiceover}
                            onCheckedChange={setVoiceover}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* FIXED Generate Button - Always at bottom */}
                  <div className="border-t border-gray-200 pt-4 bg-white h-20 flex-shrink-0">
                    <Button
                      onClick={() => {
                        if (activeSection === 'pdf' && uploadedFile) {
                          processPDF(uploadedFile)
                        } else if (activeSection === 'youtube' && youtubeLink.trim()) {
                          handleYoutubeLinkProcess()
                        } else if (activeSection === 'notes' && parsedTextContent.trim()) {
                          handleGenerate()
                        }
                      }}
                      className="w-full h-14 rounded-[8px] font-semibold text-md bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-300 disabled:text-gray-500"
                      variant="purple"
                      disabled={
                        isGenerating || 
                        !backgroundVideo ||
                        !activeSection ||
                        (activeSection === 'pdf' && !uploadedFile) ||
                        (activeSection === 'youtube' && !youtubeLink.trim()) ||
                        (activeSection === 'notes' && !parsedTextContent.trim())
                      }
                    >
                      {isGenerating ? 
                        (activeSection === 'pdf' ? "Analyzing PDF & Creating Topics..." : "Generating Video...") : 
                        activeSection === null ? 
                          "Select a Content Type Above" :
                          "Generate Brainrot Video"
                      }
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Column - Video Preview */}
          <div className="flex items-center justify-center">
            <div className="w-80 h-[600px] relative">
              {generatedVideoUrl ? (
                <video
                  controls
                  autoPlay
                  muted
                  loop
                  className="w-full h-full object-cover rounded-lg shadow-2xl"
                  src={generatedVideoUrl}
                  onError={(e) => {
                    console.error('Video playback error:', e);
                  }}
                >
                  Your browser does not support the video tag.
                </video>
              ) : generatedVideos.length > 0 ? (
                <div className="w-full h-full relative">
                  {/* Show only the first/latest video */}
                  {generatedVideos.length > 0 && generatedVideos[generatedVideos.length - 1].success && generatedVideos[generatedVideos.length - 1].videoUrl ? (
                    <video
                      controls
                      autoPlay
                      muted
                      loop
                      className="w-full h-full object-cover rounded-lg shadow-2xl"
                      src={generatedVideos[generatedVideos.length - 1].videoUrl}
                      onError={(e) => {
                        console.error('Video playback error:', e);
                      }}
                    >
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <div className="w-full h-full bg-black rounded-lg shadow-2xl flex items-center justify-center">
                      <div className="text-center p-8">
                        <p className="text-gray-400 text-center whitespace-pre-line text-lg">
                          {currentGeneratingTopic 
                            ? `🔥 Creating Video for:\n"${currentGeneratingTopic}"\n\n⚡ This might take a few minutes`
                            : "🔥 Creating Your\nBrainrot Videos...\n\n⚡ This might take a few minutes"
                          }
                        </p>
                        <div className="mt-6 space-y-3">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                          <div className="text-sm text-gray-500">
                            Generating voice... Rendering video...
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-full bg-black rounded-lg shadow-2xl flex items-center justify-center">
                  <div className="text-center p-8">
                    <p className="text-gray-400 text-center whitespace-pre-line text-lg">
                      {isGenerating || isGeneratingVideos
                        ? (currentGeneratingTopic 
                            ? `🔥 Creating Video for:\n"${currentGeneratingTopic}"\n\n⚡ This might take a few minutes`
                            : "🔥 Creating Your\nBrainrot Videos...\n\n⚡ This might take a few minutes") 
                        : "📱 Upload content &\nselect background to\nget started"}
                    </p>
                    {(isGenerating || isGeneratingVideos) && (
                      <div className="mt-6 space-y-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                        <div className="text-sm text-gray-500">
                          {activeSection === 'pdf' && !currentGeneratingTopic ? 
                            "Analyzing content... Splitting into topics..." :
                            "Generating voice... Rendering video..."
                          }
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    )
  }
